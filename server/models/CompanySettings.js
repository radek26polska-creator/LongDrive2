const db = require('../database');

const DEFAULTS = {
  name: 'Moja Firma',
  address: '',
  zipCode: '',
  city: '',
  nip: '',
  regon: '',
  tripNumberPrefix: 'TRIP-',
  tripNumberNext: 1,
  phone: '',
  email: '',
  website: '',
  logo: '',
  cardPrefix: 'KD',
  cardCounter: 1,
};

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(error) {
    if (error) return reject(error);
    resolve(this);
  });
});

const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (error, row) => {
    if (error) return reject(error);
    resolve(row);
  });
});

class CompanySettings {
  static async get(userId) {
    await run(
      `INSERT OR IGNORE INTO user_company_settings (user_id, name)
       VALUES (?, ?)`,
      [userId, DEFAULTS.name]
    );
    return get('SELECT * FROM user_company_settings WHERE user_id = ?', [userId]);
  }

  static async update(userId, data) {
    await this.get(userId);
    const allowedFields = Object.keys(DEFAULTS);
    const fields = [];
    const values = [];

    allowedFields.forEach((field) => {
      if (data[field] !== undefined && data[field] !== null) {
        fields.push(`${field} = ?`);
        values.push(data[field]);
      }
    });

    if (!fields.length) return null;
    fields.push('updatedAt = CURRENT_TIMESTAMP');
    values.push(userId);
    await run(
      `UPDATE user_company_settings SET ${fields.join(', ')} WHERE user_id = ?`,
      values
    );
    return this.get(userId);
  }

  static async incrementCardCounter(userId) {
    const result = await run(
      `UPDATE user_company_settings
       SET cardCounter = cardCounter + 1, updatedAt = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [userId]
    );
    return result.changes > 0;
  }

  static async reserveCardNumber(userId) {
    await this.get(userId);
    await run('BEGIN IMMEDIATE TRANSACTION');
    try {
      const settings = await get(
        'SELECT cardPrefix, cardCounter FROM user_company_settings WHERE user_id = ?',
        [userId]
      );
      if (!settings) throw new Error('Brak ustawień firmy użytkownika');

      const counter = Number(settings.cardCounter) || 1;
      const cardNumber = `${settings.cardPrefix || 'KD'}-${counter}`;
      await run(
        `UPDATE user_company_settings
         SET cardCounter = ?, updatedAt = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [counter + 1, userId]
      );
      await run('COMMIT');
      return cardNumber;
    } catch (error) {
      await run('ROLLBACK').catch((rollbackError) => {
        console.error('Błąd wycofywania rezerwacji numeru karty:', rollbackError);
      });
      throw error;
    }
  }

  static async getNextCardNumber(userId) {
    const settings = await this.get(userId);
    return `${settings.cardPrefix || 'KD'}-${Number(settings.cardCounter) || 1}`;
  }
}

module.exports = CompanySettings;
