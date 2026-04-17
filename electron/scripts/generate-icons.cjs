/**
 * Generates icon.png (512x512) and icon.ico (256x256 PNG-in-ICO)
 * from icons/source.png using sharp.
 *
 * Usage:
 *   node scripts/generate-icons.cjs
 *   (or: npm run icons:generate)
 *
 * For macOS icon.icns, run scripts/generate-icns.sh on a Mac.
 */

'use strict';

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '..', 'icons');
const SOURCE = path.join(ICONS_DIR, 'source.png');

async function buildIco(pngBuffer) {
  // ICO file with a single 256x256 PNG payload (supported on Vista+)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = 1 (ICO)
  header.writeUInt16LE(1, 4); // count = 1

  const entry = Buffer.alloc(16);
  entry.writeUInt8(0, 0);                      // width  (0 = 256)
  entry.writeUInt8(0, 1);                      // height (0 = 256)
  entry.writeUInt8(0, 2);                      // color count
  entry.writeUInt8(0, 3);                      // reserved
  entry.writeUInt16LE(1, 4);                   // planes
  entry.writeUInt16LE(32, 6);                  // bit count
  entry.writeUInt32LE(pngBuffer.length, 8);    // bytes in resource
  entry.writeUInt32LE(22, 12);                 // data offset (6 + 16)

  return Buffer.concat([header, entry, pngBuffer]);
}

async function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error('ERROR: icons/source.png not found. Download it first.');
    process.exit(1);
  }

  // 512x512 PNG
  await sharp(SOURCE).resize(512, 512).png().toFile(path.join(ICONS_DIR, 'icon.png'));
  console.log('✓ icons/icon.png  (512×512)');

  // 256x256 PNG → ICO binary
  const buf256 = await sharp(SOURCE).resize(256, 256).png().toBuffer();
  const ico = await buildIco(buf256);
  fs.writeFileSync(path.join(ICONS_DIR, 'icon.ico'), ico);
  console.log('✓ icons/icon.ico  (256×256, PNG-in-ICO)');

  console.log('\nDone. For macOS icon.icns, run: bash scripts/generate-icns.sh (requires macOS)');
}

main().catch((e) => { console.error(e); process.exit(1); });
