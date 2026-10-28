const express = require('express');
const router = express.Router();
const userSettingsController = require('../controllers/userSettingsController');
const { verifyToken } = require('../middleware/auth');

router.get('/appearance', verifyToken, userSettingsController.getAppearance);
router.put('/appearance', verifyToken, userSettingsController.saveAppearance);

module.exports = router;
