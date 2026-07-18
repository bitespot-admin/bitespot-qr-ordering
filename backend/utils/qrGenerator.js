// Builds the public customer-facing URL a table's QR code should point to.
function buildTableUrl(restaurantSlug, tableSlug) {
  const base = process.env.CLIENT_URL || 'http://localhost:5000';
  return `${base}/menu/${restaurantSlug}/${tableSlug}`;
}

module.exports = { buildTableUrl };
