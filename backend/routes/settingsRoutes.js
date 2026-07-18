const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const { updateSettings, updateLogo } = require('../controllers/settingsController');

router.use(protect);
router.patch('/', updateSettings);
router.patch('/logo', upload.single('logo'), updateLogo);

module.exports = router;
