const { pool } = require('../config/db');
const { generateOrderNumber } = require('../utils/slugify');

const Order = {
  // Creates the order + its line items inside a single transaction so a
  // customer never ends up with a half-saved cart.
  async createWithItems({ restaurantId, tableId, specialInstructions, items }) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const subtotal = items.reduce((sum, i) => sum + Number(i.price) * Number(i.quantity), 0);
      const orderNumber = generateOrderNumber();

      const [orderResult] = await conn.query(
        `INSERT INTO orders (restaurant_id, table_id, order_number, special_instructions, subtotal)
         VALUES (:restaurantId, :tableId, :orderNumber, :specialInstructions, :subtotal)`,
        { restaurantId, tableId, orderNumber, specialInstructions, subtotal }
      );
      const orderId = orderResult.insertId;

      for (const item of items) {
        await conn.query(
          `INSERT INTO order_items (order_id, menu_item_id, item_name, item_price, quantity)
           VALUES (:orderId, :menuItemId, :itemName, :itemPrice, :quantity)`,
          {
            orderId,
            menuItemId: item.menuItemId,
            itemName: item.name,
            itemPrice: item.price,
            quantity: item.quantity
          }
        );
      }

      await conn.commit();
      return { orderId, orderNumber, subtotal };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async findAllByRestaurant(restaurantId, { status, todayOnly } = {}) {
    let query = `
      SELECT o.*, t.label AS table_label
      FROM orders o
      JOIN tables_ t ON t.id = o.table_id
      WHERE o.restaurant_id = :restaurantId`;
    const params = { restaurantId };

    if (status) {
      query += ' AND o.status = :status';
      params.status = status;
    }
    if (todayOnly) {
      query += ' AND DATE(o.created_at) = CURDATE()';
    }
    query += ' ORDER BY o.created_at DESC';

    const [orders] = await pool.query(query, params);
    if (orders.length === 0) return [];

    const orderIds = orders.map((o) => o.id);
    const [items] = await pool.query(
      `SELECT * FROM order_items WHERE order_id IN (${orderIds.map(() => '?').join(',')})`,
      orderIds
    );

    return orders.map((order) => ({
      ...order,
      items: items.filter((i) => i.order_id === order.id)
    }));
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT o.*, t.label AS table_label FROM orders o JOIN tables_ t ON t.id = o.table_id WHERE o.id = :id LIMIT 1`,
      { id }
    );
    if (!rows[0]) return null;
    const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = :id', { id });
    return { ...rows[0], items };
  },

  async updateStatus(id, status) {
    await pool.query('UPDATE orders SET status = :status WHERE id = :id', { id, status });
  },

  async todaysStats(restaurantId) {
    const [rows] = await pool.query(
      `SELECT status, COUNT(*) AS count, COALESCE(SUM(subtotal), 0) AS total
       FROM orders
       WHERE restaurant_id = :restaurantId AND DATE(created_at) = CURDATE()
       GROUP BY status`,
      { restaurantId }
    );
    return rows;
  },

  async popularDishes(restaurantId, limit = 5) {
    const [rows] = await pool.query(
      `SELECT oi.item_name, SUM(oi.quantity) AS total_ordered
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.restaurant_id = :restaurantId
       GROUP BY oi.item_name
       ORDER BY total_ordered DESC
       LIMIT :limit`,
      { restaurantId, limit }
    );
    return rows;
  }
};

module.exports = Order;
