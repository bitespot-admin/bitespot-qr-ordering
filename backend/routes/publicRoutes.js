const express = require('express');
const router = express.Router();
const { getPublicMenu } = require('../controllers/publicController');
const { placeOrder, getPublicOrderStatus } = require('../controllers/orderController');
const { createWaiterCall } = require('../controllers/waiterCallController');

// Everything here is intentionally unauthenticated — this is the
// customer-facing surface reached by scanning a table's QR code.
router.get('/menu/:restaurantSlug/:tableSlug', getPublicMenu);
router.post('/orders', placeOrder);
router.get('/orders/:id', getPublicOrderStatus);
router.post('/waiter-calls', createWaiterCall);

module.exports = router;
