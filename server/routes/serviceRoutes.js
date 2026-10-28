const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, serviceController.getAll);
router.get('/:id', verifyToken, serviceController.getOne);
router.post('/', verifyToken, serviceController.create);
router.put('/:id', verifyToken, serviceController.update);
router.delete('/:id', verifyToken, serviceController.delete);

module.exports = router;