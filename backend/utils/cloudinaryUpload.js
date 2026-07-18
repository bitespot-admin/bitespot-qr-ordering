const { configureCloudinaryFor } = require('../config/cloudinary');

// Configures Cloudinary for this restaurant and immediately starts the
// upload in the same synchronous call — keep it this way; don't
// refactor to `await configureCloudinaryFor(...)` first, since that
// would let another request's config call interleave before this
// upload actually fires.
function uploadBufferForRestaurant(restaurant, buffer, options) {
  const cloudinary = configureCloudinaryFor(restaurant);
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => (err ? reject(err) : resolve(result)));
    stream.end(buffer);
  });
}

function destroyForRestaurant(restaurant, publicId) {
  const cloudinary = configureCloudinaryFor(restaurant);
  return cloudinary.uploader.destroy(publicId);
}

module.exports = { uploadBufferForRestaurant, destroyForRestaurant };
