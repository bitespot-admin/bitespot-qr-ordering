const bcrypt = require('bcryptjs');
const SuperAdmin = require('../models/SuperAdmin');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const generateToken = require('../utils/generateToken');
const { slugify } = require('../utils/slugify');
const { encrypt } = require('../utils/crypto');

// POST /api/super-admin/login
async function login(req, res, next) {
  try {

    const { username, password } = req.body;

    const admin = await SuperAdmin.findByUsername(username);

    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const match = await bcrypt.compare(password, admin.password_hash);

    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    generateToken(res, {
      superAdminId: admin.id,
      username: admin.username,
      role: 'super_admin'
    }, 'super_token');

    res.json({ success: true, data: { username: admin.username } });

  } catch (err) {
    console.error(err);
    next(err);
  }
}


// POST /api/super-admin/logout
function logout(req, res) {
  res.clearCookie('super_token');
  res.json({ success: true, message: 'Logged out.' });
}

// GET /api/super-admin/me
async function me(req, res, next) {
  try {
    const admin = await SuperAdmin.findById(req.superAdmin.superAdminId);
    res.json({ success: true, data: { username: admin.username } });
  } catch (err) {
    next(err);
  }
}

// GET /api/super-admin/restaurants
async function listRestaurants(req, res, next) {
  try {
    const restaurants = await Restaurant.findAllWithOwner();
    res.json({ success: true, data: restaurants });
  } catch (err) {
    next(err);
  }
}

// POST /api/super-admin/restaurants
// This replaces public self-registration: only a super admin can create
// a new restaurant tenant. Returns the generated login credentials so
// the super admin can hand them to the restaurant owner directly.
async function createRestaurant(req, res, next) {
  try {
    const { restaurantName, username, password, cloudinaryCloudName, cloudinaryApiKey, cloudinaryApiSecret } = req.body;
    if (!restaurantName || !username || !password) {
      return res.status(400).json({ success: false, message: 'Restaurant name, username, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }
    if (!cloudinaryCloudName || !cloudinaryApiKey || !cloudinaryApiSecret) {
      return res.status(400).json({
        success: false,
        message: 'Cloudinary cloud name, API key, and API secret are required — each restaurant uses its own Cloudinary account for image hosting.'
      });
    }

    const existing = await User.findByUsername(username);
    if (existing) {
      return res.status(409).json({ success: false, message: 'That username is already taken.' });
    }

    let slug = slugify(restaurantName);
    let suffix = 1;
    while (await Restaurant.slugExists(slug)) {
      suffix += 1;
      slug = `${slugify(restaurantName)}-${suffix}`;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = await User.create({ username, passwordHash });
    const restaurantId = await Restaurant.create({ userId, name: restaurantName, slug });

    await Restaurant.updateCloudinaryCredentials(restaurantId, {
      cloudName: cloudinaryCloudName.trim(),
      apiKey: cloudinaryApiKey.trim(),
      apiSecretEncrypted: encrypt(cloudinaryApiSecret.trim())
    });

    res.status(201).json({
      success: true,
      message: 'Restaurant created.',
      data: { restaurantId, slug, name: restaurantName, username, password }
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/super-admin/restaurants/:id/status   { status: 'active' | 'suspended' }
async function setRestaurantStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be "active" or "suspended".' });
    }
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found.' });
    }
    await Restaurant.setStatus(req.params.id, status);
    res.json({ success: true, message: `Restaurant ${status}.` });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, logout, me, listRestaurants, createRestaurant, setRestaurantStatus };
