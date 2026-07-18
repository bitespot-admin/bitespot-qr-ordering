const Table = require('../models/Table');
const Restaurant = require('../models/Restaurant');
const { slugify } = require('../utils/slugify');
const { generateTableFlyer } = require('../utils/flyerGenerator');
const { buildTableUrl } = require('../utils/qrGenerator');

async function getTables(req, res, next) {
  try {
    const tables = await Table.findAllByRestaurant(req.user.restaurantId);
    res.json({ success: true, data: tables });
  } catch (err) {
    next(err);
  }
}

// POST /api/tables  { label: "Table 4" }
// Creates the table, then immediately generates and uploads its QR code
// so the restaurant can download it right away.
async function createTable(req, res, next) {
  try {
    const { label } = req.body;
    if (!label || !label.trim()) {
      return res.status(400).json({ success: false, message: 'Table label is required, e.g. "Table 4".' });
    }

    const restaurant = await Restaurant.findById(req.user.restaurantId);
    let slug = slugify(label);
    if (await Table.slugExists(req.user.restaurantId, slug)) {
      return res.status(409).json({ success: false, message: 'A table with that name already exists.' });
    }

    const tableId = await Table.create({ restaurantId: req.user.restaurantId, label: label.trim(), slug });

    const targetUrl = buildTableUrl(restaurant.slug, slug);
    const flyer = await generateTableFlyer({
      restaurantName: restaurant.name,
      targetUrl,
      tableSlug: slug,
      restaurantSlug: restaurant.slug
    });
    await Table.updateQr(tableId, { qrCodeUrl: flyer.url });

    res.status(201).json({
      success: true,
      data: { id: tableId, label, slug, qrCodeUrl: flyer.url, targetUrl }
    });
  } catch (err) {
    next(err);
  }
}

async function deleteTable(req, res, next) {
  try {
    const table = await Table.findById(req.params.id);
    if (!table || table.restaurant_id !== req.user.restaurantId) {
      return res.status(404).json({ success: false, message: 'Table not found.' });
    }
    await Table.remove(req.params.id);
    res.json({ success: true, message: 'Table deleted.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getTables, createTable, deleteTable };
