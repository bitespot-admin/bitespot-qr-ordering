const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Table = require('../models/Table');
const Restaurant = require('../models/Restaurant');
const { getIO } = require('../realtime');

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
    if (restaurant.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'This restaurant is not currently accepting orders.' });
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

    // Push straight to any open admin dashboard for this restaurant —
    // this is what lets the kitchen board update without polling.
    getIO().to(`restaurant:${restaurant.id}`).emit('order:new', {
      id: order.orderId,
      orderNumber: order.orderNumber,
      tableLabel: table.label,
      subtotal: order.subtotal
    });

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

// GET /api/orders  (admin) — optional ?status=new|preparing|served|cancelled
// Defaults to today's orders only, since the kitchen board isn't meant to
// accumulate a permanent archive. Pass ?all=true to see everything (useful
// for a future order-history/reporting view).
async function getOrders(req, res, next) {
  try {
    const todayOnly = req.query.all !== 'true';
    const orders = await Order.findAllByRestaurant(req.user.restaurantId, { status: req.query.status, todayOnly });
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

    // Two audiences for this event: any other admin screen open on this
    // restaurant (so two staff devices stay in sync), and the specific
    // customer tracking this exact order (so their status page updates
    // instantly instead of waiting for its next poll).
    getIO().to(`restaurant:${req.user.restaurantId}`).emit('order:status', { id: order.id, status });
    getIO().to(`order:${order.id}`).emit('order:status', { id: order.id, status });

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
