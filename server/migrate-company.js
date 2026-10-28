const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'longdrive.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Rozpoczynam migrację bazy danych...\n');

db.serialize(() => {
  // 1. Dodaj brakujące kolumny do tabeli company_settings
  console.log('📋 Sprawdzanie kolumn w company_settings...');
  
  const columnsToAdd = [
    { name: 'zipCode', type: 'TEXT' },
    { name: 'city', type: 'TEXT' },
    { name: 'regon', type: 'TEXT' },
    { name: 'address', type: 'TEXT' },
    { name: 'phone', type: 'TEXT' },
    { name: 'email', type: 'TEXT' },
    { name: 'website', type: 'TEXT' }
  ];
  
  columnsToAdd.forEach(col => {
    db.run(`ALTER TABLE company_settings ADD COLUMN ${col.name} ${col.type}`, (err) => {
      if (err && err.message.includes('duplicate column name')) {
        console.log(`   ✅ Kolumna ${col.name} już istnieje`);
      } else if (err) {
        console.log(`   ❌ Błąd dodawania ${col.name}: ${err.message}`);
      } else {
        console.log(`   ✅ Dodano kolumnę ${col.name}`);
      }
    });
  });
  
  // 2. Sprawdź i dodaj kolumny do tabeli trips jeśli brakuje
  console.log('\n📋 Sprawdzanie kolumn w trips...');
  
  const tripColumnsToAdd = [
    { name: 'startDate', type: 'DATETIME' },
    { name: 'departureDate', type: 'DATE' },
    { name: 'departureTime', type: 'TEXT' },
    { name: 'returnDate', type: 'DATE' },
    { name: 'returnTime', type: 'TEXT' }
  ];
  
  tripColumnsToAdd.forEach(col => {
    db.run(`ALTER TABLE trips ADD COLUMN ${col.name} ${col.type}`, (err) => {
      if (err && err.message.includes('duplicate column name')) {
        console.log(`   ✅ Kolumna ${col.name} już istnieje`);
      } else if (err) {
        console.log(`   ⚠️  Błąd dodawania ${col.name}: ${err.message}`);
      } else {
        console.log(`   ✅ Dodano kolumnę ${col.name}`);
      }
    });
  });
  
  // 3. Sprawdź czy istnieją ustawienia firmy, jeśli nie - utwórz
  console.log('\n📋 Sprawdzanie ustawień firmy...');
  
  db.get("SELECT * FROM company_settings WHERE id = 1", (err, row) => {
    if (err) {
      console.log(`   ❌ Błąd odczytu: ${err.message}`);
    } else if (!row) {
      console.log('   ⚠️  Brak ustawień firmy, tworzę domyślne...');
      db.run(
        `INSERT INTO company_settings (id, name, cardPrefix, cardCounter, address, zipCode, city, nip, regon, phone, email)
         VALUES (1, 'Moja Firma', 'KD', 1, '', '', '', '', '', '', '')`,
        (err) => {
          if (err) {
            console.log(`   ❌ Błąd tworzenia: ${err.message}`);
          } else {
            console.log('   ✅ Domyślne ustawienia firmy utworzone');
          }
        }
      );
    } else {
      console.log(`   ✅ Ustawienia firmy istnieją: ${row.name || 'Moja Firma'}`);
      console.log(`   📊 Aktualne dane:`, {
        name: row.name,
        address: row.address,
        zipCode: row.zipCode,
        city: row.city,
        nip: row.nip,
        phone: row.phone,
        cardPrefix: row.cardPrefix,
        cardCounter: row.cardCounter
      });
    }
  });
  
  // 4. Wyświetl aktualną strukturę tabel
  console.log('\n📋 Struktura tabeli company_settings:');
  db.all("PRAGMA table_info(company_settings)", (err, columns) => {
    if (err) {
      console.log(`   ❌ Błąd: ${err.message}`);
    } else {
      columns.forEach(col => {
        console.log(`   - ${col.name} (${col.type})`);
      });
    }
  });
  
  // 5. Wyświetl aktualną strukturę tabeli trips
  console.log('\n📋 Struktura tabeli trips (wybrane kolumny):');
  db.all("PRAGMA table_info(trips)", (err, columns) => {
    if (err) {
      console.log(`   ❌ Błąd: ${err.message}`);
    } else {
      const importantColumns = ['id', 'startDate', 'departureDate', 'departureTime', 'returnDate', 'returnTime', 'startTime', 'endTime'];
      columns.forEach(col => {
        if (importantColumns.includes(col.name) || col.name.includes('Date') || col.name.includes('Time')) {
          console.log(`   - ${col.name} (${col.type})`);
        }
      });
    }
  });
});

setTimeout(() => {
  console.log('\n🎉 Migracja zakończona!');
  console.log('✅ Możesz teraz uruchomić serwer: node server.js');
  db.close();
}, 2000);