const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, tripController.getAll);
router.get('/:id', verifyToken, tripController.getOne);
router.post('/', verifyToken, tripController.create);
router.post('/:id/synchronize-following', verifyToken, tripController.synchronizeFollowing);
router.put('/:id', verifyToken, tripController.update);
router.delete('/:id', verifyToken, tripController.delete);

module.exports = router;