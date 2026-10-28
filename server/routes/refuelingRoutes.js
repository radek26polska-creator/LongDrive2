const express = require('express');
const router = express.Router();
const refuelingController = require('../controllers/refuelingController');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, refuelingController.getAll);
router.get('/:id', verifyToken, refuelingController.getOne);
router.post('/', verifyToken, refuelingController.create);
router.put('/:id', verifyToken, refuelingController.update);
router.delete('/:id', verifyToken, refuelingController.delete);

module.exports = router;