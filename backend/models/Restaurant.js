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
  },

  // --- Super admin: manage tenants ---
  async findAllWithOwner() {
    const [rows] = await pool.query(`
      SELECT r.*, u.username AS owner_username
      FROM restaurants r
      JOIN users u ON u.id = r.user_id
      ORDER BY r.created_at DESC
    `);
    return rows;
  },

  async setStatus(id, status) {
    await pool.query('UPDATE restaurants SET status = :status WHERE id = :id', { id, status });
  },

  // --- Custom flyer template (per restaurant) ---
  async setFlyerMode(id, flyerMode) {
    await pool.query('UPDATE restaurants SET flyer_mode = :flyerMode WHERE id = :id', { id, flyerMode });
  },

  async updateCustomFlyer(id, { customFlyerUrl, customFlyerPublicId }) {
    await pool.query(
      'UPDATE restaurants SET custom_flyer_url = :customFlyerUrl, custom_flyer_public_id = :customFlyerPublicId WHERE id = :id',
      { id, customFlyerUrl, customFlyerPublicId }
    );
  },

  // --- Per-restaurant Cloudinary credentials ---
  async updateCloudinaryCredentials(id, { cloudName, apiKey, apiSecretEncrypted }) {
    await pool.query(
      `UPDATE restaurants
       SET cloudinary_cloud_name = :cloudName, cloudinary_api_key = :apiKey, cloudinary_api_secret_encrypted = :apiSecretEncrypted
       WHERE id = :id`,
      { id, cloudName, apiKey, apiSecretEncrypted }
    );
  }
};

module.exports = Restaurant;
