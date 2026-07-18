const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { login, logout, me, changePassword } = require('../controllers/authController');

// No public /register route — in the multi-tenant model, restaurant
// accounts are created only by a super admin (see superAdminRoutes.js).
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protect, me);
router.patch('/password', protect, changePassword);

module.exports = router;
