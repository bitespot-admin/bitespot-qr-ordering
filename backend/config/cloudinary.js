const cloudinary = require('cloudinary').v2;
const { decrypt } = require('../utils/crypto');

// The Cloudinary Node SDK holds its config as global/mutable state
// rather than per-instance — so in a multi-tenant app we call
// cloudinary.config(...) immediately before every upload, synchronously
// in the same tick as the upload call itself (no `await` in between).
// Because Node's event loop can't interleave two synchronous statements,
// this is safe under concurrent requests even though the config is
// global: whichever restaurant's request configures it last, right
// before its own upload call, is the one that call actually uses.
//
// Usage:
//   const cloudinary = configureCloudinaryFor(restaurant);
//   cloudinary.uploader.upload_stream(...)   // <-- no await between these two lines
function configureCloudinaryFor(restaurant) {
  if (!restaurant.cloudinary_cloud_name || !restaurant.cloudinary_api_key || !restaurant.cloudinary_api_secret_encrypted) {
    const err = new Error(
      'This restaurant has not set up its Cloudinary credentials yet. Add them under Settings before uploading images.'
    );
    err.statusCode = 400;
    throw err;
  }

  cloudinary.config({
    cloud_name: restaurant.cloudinary_cloud_name,
    api_key: restaurant.cloudinary_api_key,
    api_secret: decrypt(restaurant.cloudinary_api_secret_encrypted),
    secure: true
  });

  return cloudinary;
}

function hasCloudinaryConfigured(restaurant) {
  return Boolean(restaurant.cloudinary_cloud_name && restaurant.cloudinary_api_key && restaurant.cloudinary_api_secret_encrypted);
}

module.exports = { configureCloudinaryFor, hasCloudinaryConfigured };
