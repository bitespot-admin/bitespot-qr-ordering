const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const {
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  setAvailability,
  deleteMenuItem
} = require('../controllers/menuController');

router.use(protect);
router.get('/', getMenuItems);
router.post('/', upload.single('image'), createMenuItem);
router.patch('/:id', upload.single('image'), updateMenuItem);
router.patch('/:id/availability', setAvailability);
router.delete('/:id', deleteMenuItem);

module.exports = router;
