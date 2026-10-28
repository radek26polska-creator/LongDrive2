const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'longdrive.db');
const db = new sqlite3.Database(dbPath);

console.log('=== POJAZDY ===');
db.all('SELECT * FROM vehicles', [], (err, rows) => {
  if (err) console.error(err);
  else console.table(rows);

  console.log('\n=== KIEROWCY ===');
  db.all('SELECT * FROM drivers', [], (err, rows) => {
    if (err) console.error(err);
    else console.table(rows);
    db.close();
  });
});