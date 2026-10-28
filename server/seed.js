const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.resolve(__dirname, 'longdrive.db');
const db = new sqlite3.Database(dbPath);

// Przykładowe pojazdy
const vehicles = [
  { brand: 'Toyota', model: 'Corolla', licensePlate: 'KR 12345', fuelType: 'Benzyna', status: 'active' },
  { brand: 'Volkswagen', model: 'Passat', licensePlate: 'KR 67890', fuelType: 'Diesel', status: 'active' },
  { brand: 'Ford', model: 'Focus', licensePlate: 'KR 11111', fuelType: 'Benzyna', status: 'active' }
];

// Przykładowi kierowcy
const drivers = [
  { firstName: 'Jan', lastName: 'Kowalski', licenseNumber: 'ABC123456', phone: '123456789', email: 'jan@example.com', status: 'active' },
  { firstName: 'Anna', lastName: 'Nowak', licenseNumber: 'DEF789012', phone: '987654321', email: 'anna@example.com', status: 'active' }
];

function insertVehicles() {
  return new Promise((resolve, reject) => {
    let count = 0;
    vehicles.forEach(v => {
      db.run(
        `INSERT INTO vehicles (brand, model, licensePlate, fuelType, status) 
         VALUES (?, ?, ?, ?, ?)`,
        [v.brand, v.model, v.licensePlate, v.fuelType, v.status],
        function(err) {
          if (err) console.error('Błąd dodawania pojazdu:', err.message);
          else console.log(`Dodano pojazd: ${v.brand} ${v.model}`);
          count++;
          if (count === vehicles.length) resolve();
        }
      );
    });
  });
}

function insertDrivers() {
  return new Promise((resolve, reject) => {
    let count = 0;
    drivers.forEach(d => {
      db.run(
        `INSERT INTO drivers (firstName, lastName, licenseNumber, phone, email, status) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [d.firstName, d.lastName, d.licenseNumber, d.phone, d.email, d.status],
        function(err) {
          if (err) console.error('Błąd dodawania kierowcy:', err.message);
          else console.log(`Dodano kierowcę: ${d.firstName} ${d.lastName}`);
          count++;
          if (count === drivers.length) resolve();
        }
      );
    });
  });
}

async function ensureAdmin() {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM users WHERE email = ?", ['admin@longdrive.pl'], async (err, row) => {
      if (err) return reject(err);
      if (!row) {
        const hash = await bcrypt.hash('admin123', 10);
        db.run(
          "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
          ['Administrator', 'admin@longdrive.pl', hash, 'admin'],
          function(err) {
            if (err) return reject(err);
            console.log('Dodano użytkownika admin');
            resolve();
          }
        );
      } else {
        resolve();
      }
    });
  });
}

async function seed() {
  await ensureAdmin();
  await insertVehicles();
  await insertDrivers();
  console.log('Zakończono seedowanie');
  db.close();
}

seed();