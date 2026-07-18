const { pool } = require('../config/db');

const Restaurant = {
  async create({ userId, name, slug }) {
    const [result] = await pool.query(
      'INSERT INTO restaurants (user_id, name, slug) VALUES (:userId, :name, :slug)',
      { userId, name, slug }
    );
    return result.insertId;
  },

  async findBySlug(slug) {
    const [rows] = await pool.query('SELECT * FROM restaurants WHERE slug = :slug LIMIT 1', { slug });
    return rows[0] || null;
  },

  async findByUserId(userId) {
    const [rows] = await pool.query('SELECT * FROM restaurants WHERE user_id = :userId LIMIT 1', { userId });
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM restaurants WHERE id = :id LIMIT 1', { id });
    return rows[0] || null;
  },

  async slugExists(slug) {
    const [rows] = await pool.query('SELECT id FROM restaurants WHERE slug = :slug LIMIT 1', { slug });
    return rows.length > 0;
  },

  async updateSettings(id, { name, phone, address, openingHours }) {
    await pool.query(
      `UPDATE restaurants
       SET name = :name, phone = :phone, address = :address, opening_hours = :openingHours
       WHERE id = :id`,
      { id, name, phone, address, openingHours }
    );
  },

  async updateLogo(id, { logoUrl, logoPublicId }) {
    await pool.query(
      'UPDATE restaurants SET logo_url = :logoUrl, logo_public_id = :logoPublicId WHERE id = :id',
      { id, logoUrl, logoPublicId }
    );
  }
};

module.exports = Restaurant;
