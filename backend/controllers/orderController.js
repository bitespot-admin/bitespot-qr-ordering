const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Table = require('../models/Table');
const Restaurant = require('../models/Restaurant');

// POST /api/public/orders  (no auth — customer places an order from the menu)
// Body: { restaurantSlug, tableSlug, items: [{ menuItemId, quantity }], specialInstructions }
async function placeOrder(req, res, next) {
  try {
    const { restaurantSlug, tableSlug, items, specialInstructions } = req.body;

    if (!restaurantSlug || !tableSlug || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Missing restaurant, table, or cart items.' });
    }

    const restaurant = await Restaurant.findBySlug(restaurantSlug);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found.' });
    }
    const table = await Table.findBySlug(restaurant.id, tableSlug);
    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found.' });
    }

    // Never trust prices sent from the client — re-look-up each item
    // server-side so a tampered request can't change what's charged.
    const resolvedItems = [];
    for (const cartLine of items) {
      const menuItem = await MenuItem.findById(cartLine.menuItemId);
      if (!menuItem || menuItem.restaurant_id !== restaurant.id || !menuItem.is_available) {
        return res.status(400).json({ success: false, message: `"${menuItem ? menuItem.name : 'An item'}" is no longer available.` });
      }
      const quantity = Math.max(1, parseInt(cartLine.quantity, 10) || 1);
      resolvedItems.push({ menuItemId: menuItem.id, name: menuItem.name, price: menuItem.price, quantity });
    }

    const order = await Order.createWithItems({
      restaurantId: restaurant.id,
      tableId: table.id,
      specialInstructions: specialInstructions ? String(specialInstructions).slice(0, 500) : null,
      items: resolvedItems
    });

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

// GET /api/orders  (admin) — optional ?status=new|preparing|ready|served|cancelled
async function getOrders(req, res, next) {
  try {
    const orders = await Order.findAllByRestaurant(req.user.restaurantId, { status: req.query.status });
    res.json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
}

// Simplified kitchen workflow: a new order is Accepted straight into
// "preparing", then marked "served" when it's delivered. The "ready"
// status still exists in the schema for compatibility but isn't used
// by this flow.
const VALID_TRANSITIONS = {
  new: ['preparing', 'cancelled'],
  preparing: ['served', 'cancelled'],
  ready: ['served'],
  served: [],
  cancelled: []
};

async function updateOrderStatus(req, res, next) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order || order.restaurant_id !== req.user.restaurantId) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const { status } = req.body;
    const allowedNext = VALID_TRANSITIONS[order.status] || [];
    if (!allowedNext.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot move order from "${order.status}" to "${status}".`
      });
    }

    await Order.updateStatus(order.id, status);
    res.json({ success: true, message: `Order marked as ${status}.` });
  } catch (err) {
    next(err);
  }
}

// GET /api/orders/dashboard-stats
async function getDashboardStats(req, res, next) {
  try {
    const [stats, popular] = await Promise.all([
      Order.todaysStats(req.user.restaurantId),
      Order.popularDishes(req.user.restaurantId, 5)
    ]);
    res.json({ success: true, data: { statusCounts: stats, popularDishes: popular } });
  } catch (err) {
    next(err);
  }
}

// GET /api/public/orders/:id?table=table-slug  (no auth — customer polls this to track their order)
// The table slug acts as a lightweight shared secret so sequential order
// IDs can't be casually browsed by guessing numbers.
async function getPublicOrderStatus(req, res, next) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    const table = await Table.findById(order.table_id);
    if (!table || table.slug !== req.query.table) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    res.json({
      success: true,
      data: {
        orderNumber: order.order_number,
        status: order.status,
        tableLabel: order.table_label,
        subtotal: order.subtotal,
        createdAt: order.created_at,
        items: order.items.map((i) => ({ name: i.item_name, price: i.item_price, quantity: i.quantity }))
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { placeOrder, getOrders, updateOrderStatus, getDashboardStats, getPublicOrderStatus };
