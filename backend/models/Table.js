const { pool } = require('../config/db');

const Table = {
  async create({ restaurantId, label, slug }) {
    const [result] = await pool.query(
      'INSERT INTO tables_ (restaurant_id, label, slug) VALUES (:restaurantId, :label, :slug)',
      { restaurantId, label, slug }
    );
    return result.insertId;
  },

  async findAllByRestaurant(restaurantId) {
    const [rows] = await pool.query(
      'SELECT * FROM tables_ WHERE restaurant_id = :restaurantId ORDER BY id ASC',
      { restaurantId }
    );
    return rows;
  },

  async findBySlug(restaurantId, slug) {
    const [rows] = await pool.query(
      'SELECT * FROM tables_ WHERE restaurant_id = :restaurantId AND slug = :slug LIMIT 1',
      { restaurantId, slug }
    );
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM tables_ WHERE id = :id LIMIT 1', { id });
    return rows[0] || null;
  },

  async slugExists(restaurantId, slug) {
    const [rows] = await pool.query(
      'SELECT id FROM tables_ WHERE restaurant_id = :restaurantId AND slug = :slug LIMIT 1',
      { restaurantId, slug }
    );
    return rows.length > 0;
  },

  async updateQr(id, { qrCodeUrl }) {
    await pool.query('UPDATE tables_ SET qr_code_url = :qrCodeUrl WHERE id = :id', { id, qrCodeUrl });
  },

  async setActive(id, isActive) {
    await pool.query('UPDATE tables_ SET is_active = :isActive WHERE id = :id', { id, isActive });
  },

  async remove(id) {
    await pool.query('DELETE FROM tables_ WHERE id = :id', { id });
  }
};

module.exports = Table;
