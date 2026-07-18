const bcrypt = require('bcryptjs');
const SuperAdmin = require('./models/SuperAdmin');

// Solves the chicken-and-egg problem of a super-admin-only system: on
// boot, if no super admin exists yet, create one from SUPER_ADMIN_USERNAME
// / SUPER_ADMIN_PASSWORD in .env. After that first account exists, these
// env vars are ignored — manage further accounts however you prefer
// (there's deliberately no self-service super-admin signup either).
async function bootstrapSuperAdmin() {
  const existingCount = await SuperAdmin.count();
  if (existingCount > 0) return;

  const username = process.env.SUPER_ADMIN_USERNAME;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!username || !password) {
    console.warn(
      '⚠️  No super admin exists yet, and SUPER_ADMIN_USERNAME/SUPER_ADMIN_PASSWORD are not set in .env.\n' +
      '   Set them and restart the server to create the first super admin account.'
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await SuperAdmin.create({ username, passwordHash });
  console.log(`✅ Created first super admin account: ${username}`);
}

module.exports = { bootstrapSuperAdmin };
