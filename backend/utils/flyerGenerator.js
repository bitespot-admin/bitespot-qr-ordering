const Jimp = require('jimp');
const QRCode = require('qrcode');
const path = require('path');
const cloudinary = require('../config/cloudinary');

const TEMPLATE_PATH = path.join(__dirname, '..', 'assets', 'flyer-template.png');

// Coordinates measured directly against flyer-template.png (1080x1630).
// If you swap in a different template image, re-measure these against
// the new file — they are pixel offsets, not proportions.
const QR_BOX = { left: 288, top: 766, right: 786, bottom: 1243 };
const QR_PADDING = 28;
const NAME_AREA = { top: 60, bottom: 230 }; // whitewashed strip reserved for the restaurant name

// Jimp ships a handful of built-in bitmap fonts (pure JS, no native
// compilation — this is the whole reason we're using Jimp over sharp
// on Termux). There's no arbitrary font-size scaling like the old
// SVG approach, so instead we pick the largest preset that still fits
// the whitewashed strip, checked widest-to-narrowest.
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

// Picks the biggest preset whose rendered width still fits inside the
// template, falling back to the smallest preset as a last resort so a
// very long name never throws — it just gets tight.
async function pickFontForName(name, maxWidth) {
  for (const preset of FONT_PRESETS) {
    const font = await loadFontCached(preset.font);
    const width = Jimp.measureText(font, name);
    if (width <= maxWidth) return font;
  }
  return loadFontCached(FONT_PRESETS[FONT_PRESETS.length - 1].font);
}

// Builds the branded table flyer: restaurant name + a live QR code
// composited onto the fixed poster artwork, then uploads the result to
// Cloudinary and returns its URL. `targetUrl` is what the QR encodes —
// the same /menu/:restaurantSlug/:tableSlug link as before.
async function generateTableFlyer({ restaurantName, targetUrl, tableSlug, restaurantSlug }) {
  const template = await Jimp.read(TEMPLATE_PATH);
  const templateWidth = template.bitmap.width;

  // --- Restaurant name text ---
  const maxTextWidth = templateWidth - 160; // side padding so it never touches the edges
  const font = await pickFontForName(restaurantName, maxTextWidth);
  const nameAreaHeight = NAME_AREA.bottom - NAME_AREA.top;
  template.print(
    font,
    0,
    NAME_AREA.top,
    {
      text: restaurantName,
      alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
      alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
    },
    templateWidth,
    nameAreaHeight
  );

  // --- QR code ---
  const qrSize = Math.min(QR_BOX.right - QR_BOX.left, QR_BOX.bottom - QR_BOX.top) - QR_PADDING * 2;
  const qrPngBuffer = await QRCode.toBuffer(targetUrl, {
    width: qrSize,
    margin: 1,
    color: { dark: '#14110F', light: '#FFFFFF' }
  });
  const qrImage = await Jimp.read(qrPngBuffer);
  qrImage.resize(qrSize, qrSize);

  const qrLeft = QR_BOX.left + ((QR_BOX.right - QR_BOX.left) - qrSize) / 2;
  const qrTop = QR_BOX.top + ((QR_BOX.bottom - QR_BOX.top) - qrSize) / 2;
  template.composite(qrImage, Math.round(qrLeft), Math.round(qrTop));

  const composite = await template.getBufferAsync(Jimp.MIME_PNG);

  const uploadResult = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `qr-ordering/${restaurantSlug}/qr-flyers`, public_id: tableSlug, overwrite: true },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(composite);
  });

  return { url: uploadResult.secure_url, publicId: uploadResult.public_id };
}

module.exports = { generateTableFlyer };
