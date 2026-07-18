const { Readable } = require('stream');
const MenuItem = require('../models/MenuItem');
const cloudinary = require('../config/cloudinary');

// Streams a multer memory-buffer straight into Cloudinary — the image
// never touches the project's disk.
function uploadBufferToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream({ folder }, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    Readable.from(buffer).pipe(uploadStream);
  });
}

async function getMenuItems(req, res, next) {
  try {
    const items = await MenuItem.findAllByRestaurant(req.user.restaurantId);
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
}

async function createMenuItem(req, res, next) {
  try {
    const { name, description, price, categoryId } = req.body;
    if (!name || !price) {
      return res.status(400).json({ success: false, message: 'Name and price are required.' });
    }
    if (Number(price) <= 0) {
      return res.status(400).json({ success: false, message: 'Price must be greater than zero.' });
    }

    let imageUrl = null;
    let imagePublicId = null;
    if (req.file) {
      const result = await uploadBufferToCloudinary(req.file.buffer, `qr-ordering/${req.user.restaurantId}/menu`);
      imageUrl = result.secure_url;
      imagePublicId = result.public_id;
    }

    const id = await MenuItem.create({
      restaurantId: req.user.restaurantId,
      categoryId: categoryId || null,
      name: name.trim(),
      description: description ? description.trim() : null,
      price: Number(price),
      imageUrl,
      imagePublicId
    });

    res.status(201).json({ success: true, data: { id } });
  } catch (err) {
    next(err);
  }
}

async function updateMenuItem(req, res, next) {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item || item.restaurant_id !== req.user.restaurantId) {
      return res.status(404).json({ success: false, message: 'Menu item not found.' });
    }

    const { name, description, price, categoryId } = req.body;
    await MenuItem.update(req.params.id, {
      name: name || item.name,
      description: description ?? item.description,
      price: price ? Number(price) : item.price,
      categoryId: categoryId || item.category_id
    });

    if (req.file) {
      const result = await uploadBufferToCloudinary(req.file.buffer, `qr-ordering/${req.user.restaurantId}/menu`);
      if (item.image_public_id) {
        await cloudinary.uploader.destroy(item.image_public_id).catch(() => {});
      }
      await MenuItem.updateImage(req.params.id, { imageUrl: result.secure_url, imagePublicId: result.public_id });
    }

    res.json({ success: true, message: 'Menu item updated.' });
  } catch (err) {
    next(err);
  }
}

async function setAvailability(req, res, next) {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item || item.restaurant_id !== req.user.restaurantId) {
      return res.status(404).json({ success: false, message: 'Menu item not found.' });
    }
    await MenuItem.setAvailability(req.params.id, req.body.isAvailable ? 1 : 0);
    res.json({ success: true, message: 'Availability updated.' });
  } catch (err) {
    next(err);
  }
}

async function deleteMenuItem(req, res, next) {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item || item.restaurant_id !== req.user.restaurantId) {
      return res.status(404).json({ success: false, message: 'Menu item not found.' });
    }
    if (item.image_public_id) {
      await cloudinary.uploader.destroy(item.image_public_id).catch(() => {});
    }
    await MenuItem.remove(req.params.id);
    res.json({ success: true, message: 'Menu item deleted.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMenuItems, createMenuItem, updateMenuItem, setAvailability, deleteMenuItem };
