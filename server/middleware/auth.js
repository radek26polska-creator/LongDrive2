const jwt = require('jsonwebtoken');
const UserSession = require('../models/UserSession');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Brak tokena autoryzacyjnego' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!Number.isSafeInteger(Number(decoded.id)) || Number(decoded.id) <= 0) {
      return res.status(401).json({ error: 'Token nie zawiera prawidłowego identyfikatora użytkownika' });
    }
    if (typeof decoded.sid !== 'string' || !decoded.sid) {
      return res.status(401).json({
        code: 'SESSION_INVALID',
        error: 'Sesja jest nieważna lub wygasła. Zaloguj się ponownie.',
      });
    }
    if (!await UserSession.isActive(Number(decoded.id), decoded.sid)) {
      return res.status(401).json({
        code: 'SESSION_INVALID',
        error: 'Sesja jest nieważna lub wygasła. Zaloguj się ponownie.',
      });
    }
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token nieważny lub wygasły' });
    }
    console.error('Błąd weryfikacji sesji:', error);
    return res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
};

module.exports = { verifyToken };