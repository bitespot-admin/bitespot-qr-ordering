const { pool } = require('../config/db');

const User = {
  async findByUsername(username) {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = :username LIMIT 1', { username });
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = :id LIMIT 1', { id });
    return rows[0] || null;
  },

  async create({ username, passwordHash }) {
    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES (:username, :passwordHash)',
      { username, passwordHash }
    );
    return result.insertId;
  },

  async updatePassword(id, passwordHash) {
    await pool.query('UPDATE users SET password_hash = :passwordHash WHERE id = :id', { id, passwordHash });
  }
};

module.exports = User;
