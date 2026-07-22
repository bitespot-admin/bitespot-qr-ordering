const Table = require('../models/Table');
const Restaurant = require('../models/Restaurant');
const { slugify } = require('../utils/slugify');
const { nanoid } = require('nanoid');
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
    let slug = nanoid(16);
    if (await Table.slugExists(req.user.restaurantId, slug)) {
      return res.status(409).json({ success: false, message: 'A table with that name already exists.' });
    }

    const tableId = await Table.create({ restaurantId: req.user.restaurantId, label: label.trim(), slug });
    const targetUrl = buildTableUrl(restaurant.slug, slug);

    // The table row is the source of truth; a flyer failure (bad Cloudinary
    // creds, transient network issue, etc.) shouldn't 500 the request and
    // leave the admin with no idea the table even got created. Instead we
    // return the table with qrCodeUrl: null and flyerError: true, so the
    // UI can offer a "Regenerate Flyer" action instead of a dead end.
    try {
      const flyer = await generateTableFlyer({ restaurant, targetUrl, tableSlug: slug });
      await Table.updateQr(tableId, { qrCodeUrl: flyer.url });
      return res.status(201).json({
        success: true,
        data: { id: tableId, label, slug, qrCodeUrl: flyer.url, targetUrl }
      });
    } catch (flyerErr) {
      console.error('Flyer generation failed for table', tableId, flyerErr);
      return res.status(201).json({
        success: true,
        data: { id: tableId, label, slug, qrCodeUrl: null, targetUrl, flyerError: true },
        message: flyerErr.statusCode === 400
          ? flyerErr.message
          : 'Table created, but the QR flyer failed to generate. Use "Regenerate Flyer" to try again.'
      });
    }
  } catch (err) {
    next(err);
  }
}

// PATCH /api/tables/:id/regenerate-flyer
// Re-runs flyer generation for an existing table — used both to recover
// from a failed generation and to refresh a table's flyer after the
// restaurant's name changes in Settings.
async function regenerateFlyer(req, res, next) {
  try {
    const table = await Table.findById(req.params.id);
    if (!table || table.restaurant_id !== req.user.restaurantId) {
      return res.status(404).json({ success: false, message: 'Table not found.' });
    }
    const restaurant = await Restaurant.findById(req.user.restaurantId);
    const targetUrl = buildTableUrl(restaurant.slug, table.slug);

    const flyer = await generateTableFlyer({ restaurant, targetUrl, tableSlug: table.slug });
    await Table.updateQr(table.id, { qrCodeUrl: flyer.url });

    res.json({ success: true, data: { id: table.id, qrCodeUrl: flyer.url } });
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

module.exports = { getTables, createTable, deleteTable, regenerateFlyer };
