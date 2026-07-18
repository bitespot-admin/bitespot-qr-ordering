const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getPendingWaiterCalls, acknowledgeWaiterCall } = require('../controllers/waiterCallController');

router.use(protect);
router.get('/', getPendingWaiterCalls);
router.patch('/:id/acknowledge', acknowledgeWaiterCall);

module.exports = router;
