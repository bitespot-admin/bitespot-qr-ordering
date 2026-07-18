const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { register, login, logout, me, changePassword } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protect, me);
router.patch('/password', protect, changePassword);

module.exports = router;
