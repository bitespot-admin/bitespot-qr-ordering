const { pool } = require('../config/db');

const Category = {
  async create({ restaurantId, name, displayOrder = 0 }) {
    const [result] = await pool.query(
      'INSERT INTO categories (restaurant_id, name, display_order) VALUES (:restaurantId, :name, :displayOrder)',
      { restaurantId, name, displayOrder }
    );
    return result.insertId;
  },

  async findAllByRestaurant(restaurantId) {
    const [rows] = await pool.query(
      'SELECT * FROM categories WHERE restaurant_id = :restaurantId ORDER BY display_order ASC, id ASC',
      { restaurantId }
    );
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM categories WHERE id = :id LIMIT 1', { id });
    return rows[0] || null;
  },

  async update(id, { name, displayOrder }) {
    await pool.query(
      'UPDATE categories SET name = :name, display_order = :displayOrder WHERE id = :id',
      { id, name, displayOrder }
    );
  },

  async remove(id) {
    await pool.query('DELETE FROM categories WHERE id = :id', { id });
  }
};

module.exports = Category;
