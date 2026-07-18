const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const generateToken = require('../utils/generateToken');
const { slugify } = require('../utils/slugify');

// POST /api/auth/register
// Collects only restaurant name, username, password — everything else
// (logo, phone, address, hours) is filled in later under Settings.
async function register(req, res, next) {
  try {
    const { restaurantName, username, password } = req.body;

    if (!restaurantName || !username || !password) {
      return res.status(400).json({ success: false, message: 'Restaurant name, username, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
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

    generateToken(res, { userId, restaurantId, username });

    res.status(201).json({
      success: true,
      message: 'Restaurant registered successfully.',
      data: { restaurantId, slug, name: restaurantName }
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const restaurant = await Restaurant.findByUserId(user.id);
    generateToken(res, { userId: user.id, restaurantId: restaurant.id, username: user.username });

    res.json({
      success: true,
      message: 'Logged in successfully.',
      data: { restaurantId: restaurant.id, slug: restaurant.slug, name: restaurant.name }
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/logout
function logout(req, res) {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out.' });
}

// GET /api/auth/me
async function me(req, res, next) {
  try {
    const restaurant = await Restaurant.findById(req.user.restaurantId);
    res.json({ success: true, data: restaurant });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/auth/password
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Valid current and new password (6+ chars) are required.' });
    }

    const user = await User.findById(req.user.userId);
    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await User.updatePassword(user.id, newHash);

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, logout, me, changePassword };
