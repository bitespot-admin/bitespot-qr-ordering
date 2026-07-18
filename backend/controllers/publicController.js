const Restaurant = require('../models/Restaurant');
const Table = require('../models/Table');
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');

// GET /api/public/menu/:restaurantSlug/:tableSlug
// This is what the QR code links to. The backend resolves the restaurant
// and table straight from the URL — the customer never types a table
// number themselves.
async function getPublicMenu(req, res, next) {
  try {
    const { restaurantSlug, tableSlug } = req.params;

    const restaurant = await Restaurant.findBySlug(restaurantSlug);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found.' });
    }

    const table = await Table.findBySlug(restaurant.id, tableSlug);
    if (!table || !table.is_active) {
      return res.status(404).json({ success: false, message: 'This table code is invalid or inactive.' });
    }

    const [categories, items] = await Promise.all([
      Category.findAllByRestaurant(restaurant.id),
      MenuItem.findAvailableByRestaurant(restaurant.id)
    ]);

    res.json({
      success: true,
      data: {
        restaurant: {
          name: restaurant.name,
          slug: restaurant.slug,
          logoUrl: restaurant.logo_url
        },
        table: { label: table.label, slug: table.slug },
        categories,
        items
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getPublicMenu };
