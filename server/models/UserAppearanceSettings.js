const db = require('../database');

class UserAppearanceSettings {
  static get(userId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT settings_json FROM user_appearance_settings WHERE user_id = ?',
        [userId],
        (error, row) => {
          if (error) return reject(error);
          if (!row) return resolve(null);
          try {
            resolve(JSON.parse(row.settings_json));
          } catch (parseError) {
            reject(new Error(`Nieprawidłowy zapis ustawień wyglądu: ${parseError.message}`));
          }
        }
      );
    });
  }

  static save(userId, settings) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO user_appearance_settings (user_id, settings_json, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id) DO UPDATE SET
           settings_json = excluded.settings_json,
           updated_at = CURRENT_TIMESTAMP`,
        [userId, JSON.stringify(settings)],
        (error) => {
          if (error) return reject(error);
          resolve(settings);
        }
      );
    });
  }
}

module.exports = UserAppearanceSettings;
