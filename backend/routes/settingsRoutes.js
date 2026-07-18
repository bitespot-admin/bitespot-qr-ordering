const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const {
  updateSettings,
  updateLogo,
  updateFlyerMode,
  updateCustomFlyer,
  getCloudinaryCredentials,
  updateCloudinaryCredentials
} = require('../controllers/settingsController');

router.use(protect);
router.patch('/', updateSettings);
router.patch('/logo', upload.single('logo'), updateLogo);
router.patch('/flyer-mode', updateFlyerMode);
router.patch('/custom-flyer', upload.single('flyer'), updateCustomFlyer);
router.get('/cloudinary', getCloudinaryCredentials);
router.patch('/cloudinary', updateCloudinaryCredentials);

module.exports = router;
