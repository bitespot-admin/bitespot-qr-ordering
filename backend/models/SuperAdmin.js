const { pool } = require('../config/db');

const SuperAdmin = {
  async findByUsername(username) {
    const [rows] = await pool.query('SELECT * FROM super_admins WHERE username = :username LIMIT 1', { username });
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM super_admins WHERE id = :id LIMIT 1', { id });
    return rows[0] || null;
  },

  async create({ username, passwordHash }) {
    const [result] = await pool.query(
      'INSERT INTO super_admins (username, password_hash) VALUES (:username, :passwordHash)',
      { username, passwordHash }
    );
    return result.insertId;
  },

  async count() {
    const [rows] = await pool.query('SELECT COUNT(*) AS count FROM super_admins');
    return rows[0].count;
  }
};

module.exports = SuperAdmin;
