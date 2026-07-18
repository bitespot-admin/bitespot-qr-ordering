const Category = require('../models/Category');

async function getCategories(req, res, next) {
  try {
    const categories = await Category.findAllByRestaurant(req.user.restaurantId);
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
}

async function createCategory(req, res, next) {
  try {
    const { name, displayOrder } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }
    const id = await Category.create({ restaurantId: req.user.restaurantId, name: name.trim(), displayOrder });
    res.status(201).json({ success: true, data: { id } });
  } catch (err) {
    next(err);
  }
}

async function updateCategory(req, res, next) {
  try {
    const category = await Category.findById(req.params.id);
    if (!category || category.restaurant_id !== req.user.restaurantId) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }
    const { name, displayOrder } = req.body;
    await Category.update(req.params.id, { name: name || category.name, displayOrder: displayOrder ?? category.display_order });
    res.json({ success: true, message: 'Category updated.' });
  } catch (err) {
    next(err);
  }
}

async function deleteCategory(req, res, next) {
  try {
    const category = await Category.findById(req.params.id);
    if (!category || category.restaurant_id !== req.user.restaurantId) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }
    await Category.remove(req.params.id);
    res.json({ success: true, message: 'Category deleted.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
