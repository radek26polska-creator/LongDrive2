const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, driverController.getAll);
router.get('/:id', verifyToken, driverController.getOne);
router.post('/', verifyToken, driverController.create);
router.put('/:id', verifyToken, driverController.update);
router.delete('/:id', verifyToken, driverController.delete);

module.exports = router;