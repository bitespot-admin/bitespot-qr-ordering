const QRCode = require('qrcode');
const cloudinary = require('../config/cloudinary');

// Builds the public customer-facing URL a table's QR code should point to.
function buildTableUrl(restaurantSlug, tableSlug) {
  const base = process.env.CLIENT_URL || 'http://localhost:5000';
  return `${base}/menu/${restaurantSlug}/${tableSlug}`;
}

// Generates a QR PNG (as a data URL / buffer) for a table, then uploads it
// to Cloudinary so the restaurant gets a permanent, downloadable link.
// Returns { url, publicId, targetUrl }.
async function generateTableQr(restaurantSlug, tableSlug) {
  const targetUrl = buildTableUrl(restaurantSlug, tableSlug);

  const qrDataUrl = await QRCode.toDataURL(targetUrl, {
    width: 600,
    margin: 2,
    color: { dark: '#111111', light: '#FFFFFF' }
  });

  const uploadResult = await cloudinary.uploader.upload(qrDataUrl, {
    folder: `qr-ordering/${restaurantSlug}/qr-codes`,
    public_id: tableSlug,
    overwrite: true
  });

  return {
    url: uploadResult.secure_url,
    publicId: uploadResult.public_id,
    targetUrl
  };
}

module.exports = { generateTableQr, buildTableUrl };
