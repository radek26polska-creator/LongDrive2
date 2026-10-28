const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const { verifyToken } = require('../middleware/auth');

// Wszystkie trasy pojazdów są chronione (wymagają tokena)
router.get('/', verifyToken, vehicleController.getAll);
router.get('/:id', verifyToken, vehicleController.getOne);
router.post('/', verifyToken, vehicleController.create);
router.put('/:id', verifyToken, vehicleController.update);
router.delete('/:id', verifyToken, vehicleController.delete);

module.exports = router;