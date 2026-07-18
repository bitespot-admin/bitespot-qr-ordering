// Turns "Bella Kitchen" into "bella-kitchen". Used for restaurant slugs
// (so the public menu URL is /menu/:restaurantSlug/:tableSlug) and for
// table slugs like "table-1".
function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Short, human-friendly order numbers for kitchen screens, e.g. "ORD-4821".
function generateOrderNumber() {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${random}`;
}

module.exports = { slugify, generateOrderNumber };
