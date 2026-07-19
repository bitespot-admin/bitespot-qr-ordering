const express = require('express');
const router = express.Router();
const { loginLimiter } = require('../middleware/rateLimitMiddleware');
const { protectSuperAdmin } = require('../middleware/superAdminMiddleware');
const {
  login,
  logout,
  me,
  listRestaurants,
  createRestaurant,
  setRestaurantStatus
} = require('../controllers/superAdminController');

router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.get('/me', protectSuperAdmin, me);
router.get('/restaurants', protectSuperAdmin, listRestaurants);
router.post('/restaurants', protectSuperAdmin, createRestaurant);
router.patch('/restaurants/:id/status', protectSuperAdmin, setRestaurantStatus);

router.get('/debug', (req, res) => {
  res.json({
    cookies: req.cookies,
    headers: req.headers
  });
});

module.exports = router;
