const WaiterCall = require('../models/WaiterCall');
const Table = require('../models/Table');
const Restaurant = require('../models/Restaurant');

// POST /api/public/waiter-calls  (no auth)
// Body: { restaurantSlug, tableSlug }
async function createWaiterCall(req, res, next) {
  try {
    const { restaurantSlug, tableSlug } = req.body;
    const restaurant = await Restaurant.findBySlug(restaurantSlug);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found.' });
    }
    const table = await Table.findBySlug(restaurant.id, tableSlug);
    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found.' });
    }

    await WaiterCall.create({ restaurantId: restaurant.id, tableId: table.id });
    res.status(201).json({ success: true, message: 'A waiter has been notified.' });
  } catch (err) {
    next(err);
  }
}

// GET /api/waiter-calls  (admin, pending only)
async function getPendingWaiterCalls(req, res, next) {
  try {
    const calls = await WaiterCall.findPendingByRestaurant(req.user.restaurantId);
    res.json({ success: true, data: calls });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/waiter-calls/:id/acknowledge
async function acknowledgeWaiterCall(req, res, next) {
  try {
    await WaiterCall.acknowledge(req.params.id);
    res.json({ success: true, message: 'Waiter call acknowledged.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { createWaiterCall, getPendingWaiterCalls, acknowledgeWaiterCall };
