const UserAppearanceSettings = require('../models/UserAppearanceSettings');

const APPEARANCE_FIELDS = new Set([
  'theme', 'backgroundColor', 'textColor', 'fontColor', 'fontFamily', 'fontSize',
  'buttonColor', 'buttonTextColor', 'buttonHoverColor', 'menuHighlightColor',
  'menuTextColor', 'menuActiveTextColor', 'topBarBackgroundColor', 'topBarTextColor',
  'topBarIconColor', 'inputTextColor', 'inputBackgroundColor',
  'requireKeyForTrip', 'animationType', 'animationSpeed', 'menuOpacity', 'cardOpacity', 'cardColor',
  'customBackground', 'menuBackgroundColor', 'cardBackgroundColor',
  'cardBorderColor', 'cardBorderWidth',
]);

const userSettingsController = {
  async getAppearance(req, res) {
    try {
      const settings = await UserAppearanceSettings.get(req.user.id);
      res.json({ appearance: settings });
    } catch (error) {
      console.error('Błąd pobierania ustawień wyglądu użytkownika:', error);
      res.status(500).json({ error: 'Nie udało się pobrać ustawień wyglądu' });
    }
  },

  async saveAppearance(req, res) {
    try {
      const appearance = req.body?.appearance;
      if (!appearance || typeof appearance !== 'object' || Array.isArray(appearance)) {
        return res.status(400).json({ error: 'Ustawienia wyglądu muszą być obiektem' });
      }

      const unknownFields = Object.keys(appearance).filter((field) => !APPEARANCE_FIELDS.has(field));
      if (unknownFields.length) {
        return res.status(400).json({ error: 'Ustawienia zawierają niedozwolone pola' });
      }

      const serialized = JSON.stringify(appearance);
      if (Buffer.byteLength(serialized, 'utf8') > 2 * 1024 * 1024) {
        return res.status(413).json({ error: 'Ustawienia wyglądu przekraczają limit 2 MB' });
      }

      const saved = await UserAppearanceSettings.save(req.user.id, appearance);
      res.json({ appearance: saved });
    } catch (error) {
      console.error('Błąd zapisu ustawień wyglądu użytkownika:', error);
      res.status(500).json({ error: 'Nie udało się zapisać ustawień wyglądu' });
    }
  },
};

module.exports = userSettingsController;
