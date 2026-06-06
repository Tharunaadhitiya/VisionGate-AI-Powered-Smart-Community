const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SVG_PATH = path.join(__dirname, '..', 'public', 'icons', 'icon.svg');
const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  const svg = fs.readFileSync(SVG_PATH, 'utf-8');

  for (const size of SIZES) {
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(path.join(ICONS_DIR, `icon-${size}x${size}.png`));
    console.log(`Created icon-${size}x${size}.png`);
  }

  await sharp(Buffer.from(svg))
    .resize(192, 192)
    .png()
    .toFile(path.join(ICONS_DIR, 'maskable-icon-192x192.png'));
  console.log('Created maskable-icon-192x192.png');

  await sharp(Buffer.from(svg))
    .resize(512, 512)
    .png()
    .toFile(path.join(ICONS_DIR, 'maskable-icon-512x512.png'));
  console.log('Created maskable-icon-512x512.png');

  await sharp(Buffer.from(svg))
    .resize(48, 48)
    .png()
    .toFile(path.join(ICONS_DIR, '..', 'favicon.ico'));
  console.log('Created favicon.ico');
}

generateIcons().catch(console.error);
