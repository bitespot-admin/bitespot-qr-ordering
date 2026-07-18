const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getTables, createTable, deleteTable } = require('../controllers/tableController');

router.use(protect);
router.get('/', getTables);
router.post('/', createTable);
router.delete('/:id', deleteTable);

module.exports = router;
