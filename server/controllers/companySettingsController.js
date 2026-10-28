const CompanySettings = require('../models/CompanySettings');

const companySettingsController = {
  async get(req, res) {
    try {
      const settings = await CompanySettings.get(req.user.id);
      res.json(settings);
    } catch (error) {
      console.error('❌ Błąd podczas pobierania ustawień firmy:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  },

  async update(req, res) {
    try {
      const updated = await CompanySettings.update(req.user.id, req.body);
      
      if (!updated) {
        return res.status(404).json({ error: 'Nie można zaktualizować ustawień' });
      }
      
      res.json(updated);
    } catch (error) {
      console.error('❌ Błąd podczas aktualizacji ustawień firmy:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  },

  async getNextCardNumber(req, res) {
    try {
      const cardNumber = await CompanySettings.getNextCardNumber(req.user.id);
      const settings = await CompanySettings.get(req.user.id);
      res.json({ 
        cardNumber,
        prefix: settings.cardPrefix,
        nextNumber: settings.cardCounter,
        fullNumber: cardNumber
      });
    } catch (error) {
      console.error('Błąd podczas pobierania numeru karty:', error);
      res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
    }
  }
};

module.exports = companySettingsController;