const { Readable } = require('stream');
const Restaurant = require('../models/Restaurant');
const cloudinary = require('../config/cloudinary');

function uploadBufferToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream({ folder }, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    Readable.from(buffer).pipe(uploadStream);
  });
}

// PATCH /api/settings
async function updateSettings(req, res, next) {
  try {
    const { name, phone, address, openingHours } = req.body;
    const restaurant = await Restaurant.findById(req.user.restaurantId);

    await Restaurant.updateSettings(req.user.restaurantId, {
      name: name || restaurant.name,
      phone: phone ?? restaurant.phone,
      address: address ?? restaurant.address,
      openingHours: openingHours ?? restaurant.opening_hours
    });

    res.json({ success: true, message: 'Settings updated.' });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/settings/logo  (multipart, field name "logo")
async function updateLogo(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No logo file provided.' });
    }
    const restaurant = await Restaurant.findById(req.user.restaurantId);
    const result = await uploadBufferToCloudinary(req.file.buffer, `qr-ordering/${restaurant.id}/logo`);

    if (restaurant.logo_public_id) {
      await cloudinary.uploader.destroy(restaurant.logo_public_id).catch(() => {});
    }

    await Restaurant.updateLogo(req.user.restaurantId, { logoUrl: result.secure_url, logoPublicId: result.public_id });
    res.json({ success: true, data: { logoUrl: result.secure_url } });
  } catch (err) {
    next(err);
  }
}

module.exports = { updateSettings, updateLogo };
