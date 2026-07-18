require('dotenv').config();

const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

async function resetSuperAdmin() {
  try {
    const username = process.argv[2];
    const newPassword = process.argv[3];

    if (!username || !newPassword) {
      console.log(
        'Usage: node scripts/reset-super-admin.js <username> <new_password>'
      );
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    const [result] = await pool.execute(
      `
      UPDATE super_admins
      SET password_hash = ?
      WHERE username = ?
      `,
      [passwordHash, username]
    );

    if (result.affectedRows === 0) {
      console.log(`❌ No super admin found with username: ${username}`);
    } else {
      console.log(`✅ Password updated for: ${username}`);
    }

    await pool.end();

  } catch (err) {
    console.error('❌ Password reset failed:', err.message);
    process.exit(1);
  }
}

resetSuperAdmin();
