const express = require('express');
const router = express.Router();
const companySettingsController = require('../controllers/companySettingsController');
const { verifyToken } = require('../middleware/auth');

// Tylko jedna trasa – pobieranie i aktualizacja ustawień
router.get('/', verifyToken, companySettingsController.get);
router.put('/', verifyToken, companySettingsController.update);

module.exports = router;