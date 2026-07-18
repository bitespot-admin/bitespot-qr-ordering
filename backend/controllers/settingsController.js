const Restaurant = require('../models/Restaurant');
const { uploadBufferForRestaurant, destroyForRestaurant } = require('../utils/cloudinaryUpload');
const { encrypt } = require('../utils/crypto');

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
    const result = await uploadBufferForRestaurant(restaurant, req.file.buffer, {
      folder: `qr-ordering/${restaurant.slug}/logo`
    });

    if (restaurant.logo_public_id) {
      await destroyForRestaurant(restaurant, restaurant.logo_public_id).catch(() => {});
    }

    await Restaurant.updateLogo(req.user.restaurantId, { logoUrl: result.secure_url, logoPublicId: result.public_id });
    res.json({ success: true, data: { logoUrl: result.secure_url } });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/settings/flyer-mode   { flyerMode: 'default' | 'custom' }
async function updateFlyerMode(req, res, next) {
  try {
    const { flyerMode } = req.body;
    if (!['default', 'custom'].includes(flyerMode)) {
      return res.status(400).json({ success: false, message: 'flyerMode must be "default" or "custom".' });
    }
    await Restaurant.setFlyerMode(req.user.restaurantId, flyerMode);
    res.json({ success: true, message: `Flyer mode set to ${flyerMode}.` });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/settings/custom-flyer  (multipart, field name "flyer")
// Uploads the restaurant's own artwork to use as the table flyer
// background. Doesn't regenerate existing tables' flyers automatically —
// use "Regenerate Flyer" per table (or re-run for all) after uploading.
async function updateCustomFlyer(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No flyer image provided.' });
    }
    const restaurant = await Restaurant.findById(req.user.restaurantId);
    const result = await uploadBufferForRestaurant(restaurant, req.file.buffer, {
      folder: `qr-ordering/${restaurant.slug}/custom-flyer`
    });

    if (restaurant.custom_flyer_public_id) {
      await destroyForRestaurant(restaurant, restaurant.custom_flyer_public_id).catch(() => {});
    }

    await Restaurant.updateCustomFlyer(req.user.restaurantId, {
      customFlyerUrl: result.secure_url,
      customFlyerPublicId: result.public_id
    });
    res.json({ success: true, data: { customFlyerUrl: result.secure_url } });
  } catch (err) {
    next(err);
  }
}

// GET /api/settings/cloudinary
// Never returns the secret — only whether it's configured, plus the
// non-sensitive cloud name/key so the owner can confirm which account
// is connected without re-typing anything.
async function getCloudinaryCredentials(req, res, next) {
  try {
    const restaurant = await Restaurant.findById(req.user.restaurantId);
    res.json({
      success: true,
      data: {
        configured: Boolean(restaurant.cloudinary_cloud_name && restaurant.cloudinary_api_key && restaurant.cloudinary_api_secret_encrypted),
        cloudName: restaurant.cloudinary_cloud_name || null,
        apiKey: restaurant.cloudinary_api_key || null
      }
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/settings/cloudinary   { cloudName, apiKey, apiSecret }
// Lets a restaurant owner set up or rotate their own Cloudinary
// credentials later (e.g. if the super admin didn't set them at
// creation time, or the restaurant wants to switch accounts).
async function updateCloudinaryCredentials(req, res, next) {
  try {
    const { cloudName, apiKey, apiSecret } = req.body;
    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(400).json({ success: false, message: 'Cloud name, API key, and API secret are all required.' });
    }

    await Restaurant.updateCloudinaryCredentials(req.user.restaurantId, {
      cloudName: cloudName.trim(),
      apiKey: apiKey.trim(),
      apiSecretEncrypted: encrypt(apiSecret.trim())
    });

    res.json({ success: true, message: 'Cloudinary credentials updated.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  updateSettings,
  updateLogo,
  updateFlyerMode,
  updateCustomFlyer,
  getCloudinaryCredentials,
  updateCloudinaryCredentials
};
