const express = require('express');
const router = express.Router();
const keyLogController = require('../controllers/keyLogController');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, keyLogController.getAll);
router.get('/active', verifyToken, keyLogController.getActiveIssues);
router.get('/:id', verifyToken, keyLogController.getOne);
router.post('/', verifyToken, keyLogController.create);
router.put('/:id', verifyToken, keyLogController.update);
router.delete('/:id', verifyToken, keyLogController.delete);

module.exports = router;