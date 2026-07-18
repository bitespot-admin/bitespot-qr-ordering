const mysql = require('mysql2/promise');
require('dotenv').config();

// Central connection pool. Every model borrows a connection from here —
// never opens its own, so the app doesn't leak connections under load.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  ssl: {
    rejectUnauthorized: false
  },

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  namedPlaceholders: true
});

// Fail fast on boot if the DB is unreachable, instead of surfacing
// confusing errors on the first request.
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('✅ MariaDB connected');
  } catch (err) {
    console.error('❌ MariaDB connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = { pool, testConnection };
