const express = require('express');
const router = express.Router();
const { protectSuperAdmin } = require('../middleware/superAdminMiddleware');
const {
  login,
  logout,
  me,
  listRestaurants,
  createRestaurant,
  setRestaurantStatus
} = require('../controllers/superAdminController');

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protectSuperAdmin, me);
router.get('/restaurants', protectSuperAdmin, listRestaurants);
router.post('/restaurants', protectSuperAdmin, createRestaurant);
router.patch('/restaurants/:id/status', protectSuperAdmin, setRestaurantStatus);

module.exports = router;
