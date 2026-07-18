const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getOrders, updateOrderStatus, getDashboardStats } = require('../controllers/orderController');

router.use(protect);
router.get('/', getOrders);
router.get('/dashboard-stats', getDashboardStats);
router.patch('/:id/status', updateOrderStatus);

module.exports = router;
