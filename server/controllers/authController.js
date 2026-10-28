const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../database'); // potrzebne do bezpośredniego zapytania w update
const UserSession = require('../models/UserSession');

const normalizeEmail = (email) => email.trim().toLowerCase();
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const createAuthenticatedSession = async (user) => {
  const sessionId = crypto.randomUUID();
  const expiresAt = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, sid: sessionId, exp: expiresAt },
    process.env.JWT_SECRET
  );
  const created = await UserSession.create(user.id, sessionId, expiresAt);
  return created ? token : null;
};

const authController = {
  async bootstrapStatus(req, res) {
    if (process.env.LONGDRIVE_RUNTIME !== 'windows') {
      return res.json({ available: false });
    }

    try {
      res.json(await User.getWindowsBootstrapStatus());
    } catch (error) {
      console.error('Błąd sprawdzania stanu inicjalizacji administratora:', error);
      res.status(503).json({ error: 'Stan inicjalizacji administratora jest niedostępny' });
    }
  },

  // Rejestracja nowego użytkownika
  async register(req, res) {
    try {
      const { name, email: submittedEmail, password } = req.body || {};

      if (typeof name !== 'string' || !name.trim() ||
          typeof submittedEmail !== 'string' || !submittedEmail.trim() ||
          typeof password !== 'string' || !password) {
        return res.status(400).json({ error: 'Wszystkie pola są wymagane' });
      }

      const email = normalizeEmail(submittedEmail);
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Podaj prawidłowy adres email' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'Hasło musi mieć co najmniej 6 znaków' });
      }

      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: 'Użytkownik z tym emailem już istnieje' });
      }

      const newUser = process.env.LONGDRIVE_RUNTIME === 'windows'
        ? await User.createWindowsRuntimeUser({
          name: name.trim(),
          email,
          password,
          bootstrapToken: req.get('X-LongDrive-Bootstrap-Token'),
        })
        : await User.create({ name: name.trim(), email, password, role: 'user' });
      
      const token = await createAuthenticatedSession(newUser);
      if (!token) {
        return res.status(409).json({
          code: 'ACCOUNT_SESSION_ACTIVE',
          error: 'To konto jest już zalogowane na innym urządzeniu.',
        });
      }

      res.status(201).json({
        message: 'Rejestracja zakończona pomyślnie',
        user: newUser,
        token
      });
    } catch (error) {
      if (error.code === 'BOOTSTRAP_NOT_CONFIGURED') {
        return res.status(503).json({ error: 'Inicjalizacja administratora nie jest skonfigurowana' });
      }
      if (error.code === 'BOOTSTRAP_REQUIRED' || error.code === 'BOOTSTRAP_INVALID') {
        return res.status(403).json({ error: 'Brak prawidłowego tokenu inicjalizacji administratora' });
      }
      if (error.code === 'BOOTSTRAP_TOKEN_USED') {
        return res.status(409).json({ error: 'Token inicjalizacji administratora został już użyty' });
      }
      if (error.code === 'BOOTSTRAP_STATE_UNAVAILABLE') {
        return res.status(503).json({ error: 'Stan inicjalizacji administratora jest niedostępny' });
      }
      if (error.code === 'USER_ALREADY_EXISTS') {
        return res.status(409).json({ error: 'Użytkownik z tym emailem już istnieje' });
      }
      if (error.code?.startsWith('SQLITE_CONSTRAINT') &&
          error.message?.includes('UNIQUE constraint failed: users.email')) {
        return res.status(409).json({ error: 'Użytkownik z tym emailem już istnieje' });
      }
      if (error.code === '23505' && error.constraint === 'users_email_key') {
        return res.status(409).json({ error: 'Użytkownik z tym emailem już istnieje' });
      }
      console.error('Błąd rejestracji:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  },

  // Logowanie użytkownika
  async login(req, res) {
    try {
      const { email: submittedEmail, password } = req.body || {};

      if (typeof submittedEmail !== 'string' || !submittedEmail.trim() ||
          typeof password !== 'string' || !password) {
        return res.status(400).json({ error: 'Email i hasło są wymagane' });
      }

      const email = normalizeEmail(submittedEmail);
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(404).json({
          code: 'USER_NOT_FOUND',
          error: 'Użytkownik o podanym adresie email nie istnieje',
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          code: 'INVALID_PASSWORD',
          error: 'Wprowadzone hasło jest nieprawidłowe',
        });
      }

      const token = await createAuthenticatedSession(user);
      if (!token) {
        return res.status(409).json({
          code: 'ACCOUNT_SESSION_ACTIVE',
          error: 'To konto jest już zalogowane na innym urządzeniu.',
        });
      }

      delete user.password_hash;

      res.json({
        message: 'Logowanie pomyślne',
        user,
        token
      });
    } catch (error) {
      console.error('Błąd logowania:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  },

  // Pobieranie danych zalogowanego użytkownika
  async me(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
      }
      res.json(user);
    } catch (error) {
      console.error('Błąd pobierania profilu:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  },

  async logout(req, res) {
    try {
      await UserSession.revoke(req.user.id, req.user.sid);
      res.json({ message: 'Wylogowano pomyślnie' });
    } catch (error) {
      console.error('Błąd unieważniania sesji:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  },

  async changePassword(req, res) {
    try {
      if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        return res.status(400).json({ error: 'Nieprawidłowe dane zmiany hasła' });
      }

      const currentPassword = req.body.currentPassword ?? req.body.oldPassword;
      const { newPassword } = req.body;

      if (typeof currentPassword !== 'string' || !currentPassword ||
          typeof newPassword !== 'string' || !newPassword) {
        return res.status(400).json({ error: 'Obecne i nowe hasło są wymagane' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Hasło musi mieć co najmniej 6 znaków' });
      }

      const user = await User.findByIdWithPassword(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Obecne hasło jest nieprawidłowe' });
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await User.updatePassword(req.user.id, passwordHash);

      res.json({ message: 'Hasło zostało zmienione' });
    } catch (error) {
      console.error('Błąd zmiany hasła:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  },

  // Aktualizacja profilu użytkownika (imię, email, hasło)
  async update(req, res) {
    try {
      const { name, email, phone, currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      // Pobierz aktualnego użytkownika z bazy (z hashem)
      const user = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!user) {
        return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
      }

      // Przygotuj dane do aktualizacji
      const updatedData = {
        name: name || user.name,
        email: email || user.email,
        phone: phone === undefined ? user.phone : phone,
        password_hash: user.password_hash
      };

      // Jeśli podano nowe hasło, sprawdź stare i zaktualizuj
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ error: 'Aby zmienić hasło, podaj obecne hasło' });
        }

        const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isPasswordValid) {
          return res.status(401).json({ error: 'Obecne hasło jest nieprawidłowe' });
        }

        const saltRounds = 10;
        updatedData.password_hash = await bcrypt.hash(newPassword, saltRounds);
      }

      // Zapisz zmiany w bazie
      await User.update(userId, updatedData);

      // Zwróć zaktualizowane dane (bez hasła)
      const updatedUser = await User.findById(userId);
      res.json(updatedUser);
    } catch (error) {
      console.error('Błąd aktualizacji profilu:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  }
};

module.exports = authController;