const { pool } = require('../config/db');

const MenuItem = {
  async create({ restaurantId, categoryId, name, description, price, imageUrl, imagePublicId }) {
    const [result] = await pool.query(
      `INSERT INTO menu_items
        (restaurant_id, category_id, name, description, price, image_url, image_public_id)
       VALUES (:restaurantId, :categoryId, :name, :description, :price, :imageUrl, :imagePublicId)`,
      { restaurantId, categoryId, name, description, price, imageUrl, imagePublicId }
    );
    return result.insertId;
  },

  // Used by the admin dashboard: all items, including sold-out ones.
  async findAllByRestaurant(restaurantId) {
    const [rows] = await pool.query(
      `SELECT mi.*, c.name AS category_name
       FROM menu_items mi
       LEFT JOIN categories c ON c.id = mi.category_id
       WHERE mi.restaurant_id = :restaurantId
       ORDER BY mi.created_at DESC`,
      { restaurantId }
    );
    return rows;
  },

  // Used by the public customer menu: only available items.
  async findAvailableByRestaurant(restaurantId) {
    const [rows] = await pool.query(
      `SELECT mi.*, c.name AS category_name
       FROM menu_items mi
       LEFT JOIN categories c ON c.id = mi.category_id
       WHERE mi.restaurant_id = :restaurantId AND mi.is_available = 1
       ORDER BY mi.is_popular DESC, mi.created_at DESC`,
      { restaurantId }
    );
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM menu_items WHERE id = :id LIMIT 1', { id });
    return rows[0] || null;
  },

  async update(id, { categoryId, name, description, price }) {
    await pool.query(
      `UPDATE menu_items
       SET category_id = :categoryId, name = :name, description = :description, price = :price
       WHERE id = :id`,
      { id, categoryId, name, description, price }
    );
  },

  async updateImage(id, { imageUrl, imagePublicId }) {
    await pool.query(
      'UPDATE menu_items SET image_url = :imageUrl, image_public_id = :imagePublicId WHERE id = :id',
      { id, imageUrl, imagePublicId }
    );
  },

  async setAvailability(id, isAvailable) {
    await pool.query('UPDATE menu_items SET is_available = :isAvailable WHERE id = :id', { id, isAvailable });
  },

  async remove(id) {
    await pool.query('DELETE FROM menu_items WHERE id = :id', { id });
  }
};

module.exports = MenuItem;
