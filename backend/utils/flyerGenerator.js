const Jimp = require('jimp');
const QRCode = require('qrcode');
const path = require('path');
const { uploadBufferForRestaurant } = require('./cloudinaryUpload');

const TEMPLATE_PATH = path.join(__dirname, '..', 'assets', 'flyer-template.png');

// Coordinates measured directly against flyer-template.png (1080x1630).
// If you swap in a different DEFAULT template image, re-measure these
// against the new file — they are pixel offsets, not proportions.
const QR_BOX = { left: 288, top: 766, right: 786, bottom: 1243 };
const QR_PADDING = 28;
const NAME_AREA = { top: 60, bottom: 230 }; // whitewashed strip reserved for the restaurant name

// Jimp ships a handful of built-in bitmap fonts (pure JS, no native
// compilation — this is the whole reason we're using Jimp over sharp
// on Termux). There's no arbitrary font-size scaling like an SVG
// approach would give, so instead we pick the largest preset that
// still fits the whitewashed strip, checked widest-to-narrowest.
const FONT_PRESETS = [
  { size: 128, font: Jimp.FONT_SANS_128_BLACK },
  { size: 64, font: Jimp.FONT_SANS_64_BLACK },
  { size: 32, font: Jimp.FONT_SANS_32_BLACK },
  { size: 16, font: Jimp.FONT_SANS_16_BLACK }
];

const fontCache = new Map();
async function loadFontCached(fontConst) {
  if (!fontCache.has(fontConst)) {
    fontCache.set(fontConst, await Jimp.loadFont(fontConst));
  }
  return fontCache.get(fontConst);
}

async function pickFontForName(name, maxWidth) {
  for (const preset of FONT_PRESETS) {
    const font = await loadFontCached(preset.font);
    const width = Jimp.measureText(font, name);
    if (width <= maxWidth) return font;
  }
  return loadFontCached(FONT_PRESETS[FONT_PRESETS.length - 1].font);
}

async function buildQrImage(targetUrl, size) {
  const qrPngBuffer = await QRCode.toBuffer(targetUrl, {
    width: size,
    margin: 1,
    color: { dark: '#14110F', light: '#FFFFFF' }
  });
  const qrImage = await Jimp.read(qrPngBuffer);
  qrImage.resize(size, size);
  return qrImage;
}

// --- Default template path: our branded artwork, restaurant name text
// composited into the pre-measured whitewashed strip, QR into the
// pre-measured box. ---
async function buildDefaultFlyer(restaurantName, targetUrl) {
  const template = await Jimp.read(TEMPLATE_PATH);
  const templateWidth = template.bitmap.width;

  const maxTextWidth = templateWidth - 160;
  const font = await pickFontForName(restaurantName, maxTextWidth);
  const nameAreaHeight = NAME_AREA.bottom - NAME_AREA.top;
  template.print(
    font,
    0,
    NAME_AREA.top,
    { text: restaurantName, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER, alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE },
    templateWidth,
    nameAreaHeight
  );

  const qrSize = Math.min(QR_BOX.right - QR_BOX.left, QR_BOX.bottom - QR_BOX.top) - QR_PADDING * 2;
  const qrImage = await buildQrImage(targetUrl, qrSize);
  const qrLeft = QR_BOX.left + ((QR_BOX.right - QR_BOX.left) - qrSize) / 2;
  const qrTop = QR_BOX.top + ((QR_BOX.bottom - QR_BOX.top) - qrSize) / 2;
  template.composite(qrImage, Math.round(qrLeft), Math.round(qrTop));

  return template;
}

// --- Custom template path: the restaurant uploaded their own artwork.
// We don't know where any safe/whitewashed text area is on an arbitrary
// image, so we never overlay the restaurant's name — just the QR,
// centered, sized proportionally to the image, on a white backdrop so
// it stays scannable regardless of what's behind it. ---
async function buildCustomFlyer(customFlyerUrl, targetUrl) {
  const res = await fetch(customFlyerUrl);
  if (!res.ok) throw new Error(`Could not download custom flyer template (HTTP ${res.status})`);
  const arrayBuffer = await res.arrayBuffer();
  const template = await Jimp.read(Buffer.from(arrayBuffer));

  const { width, height } = template.bitmap;
  const qrSize = Math.round(Math.min(width, height) * 0.34);
  const padding = Math.round(qrSize * 0.08);
  const backdropSize = qrSize + padding * 2;

  const backdrop = new Jimp(backdropSize, backdropSize, 0xffffffff);
  const qrImage = await buildQrImage(targetUrl, qrSize);
  backdrop.composite(qrImage, padding, padding);

  const left = Math.round((width - backdropSize) / 2);
  const top = Math.round((height - backdropSize) / 2);
  template.composite(backdrop, left, top);

  return template;
}

// Builds the branded table flyer, uploads it to the RESTAURANT'S OWN
// Cloudinary account, returns its URL. Branches on the restaurant's
// flyer_mode: 'default' uses our pre-built artwork with the restaurant's
// name composited in; 'custom' uses whatever template the restaurant
// uploaded in Settings, with just the QR placed centered on top. Falls
// back to 'default' if 'custom' is selected but no template uploaded yet.
async function generateTableFlyer({ restaurant, targetUrl, tableSlug }) {
  const template =
    restaurant.flyer_mode === 'custom' && restaurant.custom_flyer_url
      ? await buildCustomFlyer(restaurant.custom_flyer_url, targetUrl)
      : await buildDefaultFlyer(restaurant.name, targetUrl);

  const composite = await template.getBufferAsync(Jimp.MIME_PNG);

  const uploadResult = await uploadBufferForRestaurant(restaurant, composite, {
    folder: `qr-ordering/${restaurant.slug}/qr-flyers`,
    public_id: tableSlug,
    overwrite: true
  });

  return { url: uploadResult.secure_url, publicId: uploadResult.public_id };
}

module.exports = { generateTableFlyer };
