const { pool } = require('../config/db');

const WaiterCall = {
  async create({ restaurantId, tableId }) {
    const [result] = await pool.query(
      'INSERT INTO waiter_calls (restaurant_id, table_id) VALUES (:restaurantId, :tableId)',
      { restaurantId, tableId }
    );
    return result.insertId;
  },

  async findPendingByRestaurant(restaurantId) {
    const [rows] = await pool.query(
      `SELECT wc.*, t.label AS table_label
       FROM waiter_calls wc
       JOIN tables_ t ON t.id = wc.table_id
       WHERE wc.restaurant_id = :restaurantId AND wc.status = 'pending'
       ORDER BY wc.created_at ASC`,
      { restaurantId }
    );
    return rows;
  },

  async acknowledge(id) {
    await pool.query("UPDATE waiter_calls SET status = 'acknowledged' WHERE id = :id", { id });
  }
};

module.exports = WaiterCall;
