const CompanySettings = require('../models/CompanySettings');

const companySettingsController = {
  async get(req, res) {
    try {
      const settings = await CompanySettings.get();
      res.json(settings);
    } catch (error) {
      console.error('Błąd podczas pobierania ustawień firmy:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  },

  async update(req, res) {
    try {
      const updated = await CompanySettings.update(req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Nie można zaktualizować ustawień' });
      }
      res.json(updated);
    } catch (error) {
      console.error('Błąd podczas aktualizacji ustawień firmy:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  }
};

module.exports = companySettingsController;