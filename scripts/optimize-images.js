/**
 * Brutalist Chrome — Image Optimization Script
 *
 * Converts theme.png to WebP at multiple sizes,
 * generates Chrome extension icons,
 * and creates dark variant / thumbnails.
 *
 * Usage:
 *   node scripts/optimize-images.js
 *
 * Dependencies: sharp
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const THEME_PNG = path.join(ROOT, '..', 'theme.png'); // Original image at A:\extension\theme.png
const ASSETS_DIR = path.join(ROOT, 'assets');
const WALLPAPERS_DIR = path.join(ASSETS_DIR, 'wallpapers');
const ICONS_DIR = path.join(ASSETS_DIR, 'icons');

const ICON_SIZES = [16, 32, 48, 64, 128];
const WALLPAPER_SIZES = [
  { name: 'background', width: 1920 },
  { name: 'background-1280', width: 1280 },
  { name: 'background-768', width: 768 },
  { name: 'thumbnail', width: 400 },
];

/**
 * Ensure a directory exists.
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Get the average luminance of an image region.
 * Returns value 0-255.
 */
async function getLuminance(imageBuffer) {
  const { data, info } = await sharp(imageBuffer)
    .resize(1, 1, { fit: 'cover' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const r = data[0];
  const g = data[1];
  const b = data[2];
  return Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
}

/**
 * Generate a darkened variant of an image.
 */
function createDarkVariant(imageBuffer, factor = 0.6) {
  return sharp(imageBuffer)
    .modulate({
      brightness: factor,
      saturation: 0.8,
    })
    .toBuffer();
}

/**
 * Generate all icon sizes from the source image.
 */
async function generateIcons(imageBuffer) {
  console.log('Generating icons...');

  ensureDir(ICONS_DIR);

  for (const size of ICON_SIZES) {
    const outputPath = path.join(ICONS_DIR, `icon-${size}.png`);
    await sharp(imageBuffer)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(outputPath);
    console.log(`  ✓ icon-${size}.png`);
  }

  // Generate small icon variants (for action popup)
  await sharp(imageBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-32.png'));
}

/**
 * Generate wallpaper variants at multiple sizes in WebP format.
 */
async function generateWallpapers(imageBuffer) {
  console.log('Generating wallpapers...');

  ensureDir(WALLPAPERS_DIR);

  for (const { name, width } of WALLPAPER_SIZES) {
    const outputPath = path.join(WALLPAPERS_DIR, `${name}.webp`);
    await sharp(imageBuffer)
      .resize(width, undefined, {
        fit: 'cover',
        withoutEnlargement: true,
      })
      .webp({
        quality: 85,
        alphaQuality: 90,
        effort: 6,
        smartSubsample: true,
      })
      .toFile(outputPath);
    console.log(`  ✓ ${name}.webp (${width}px)`);
  }
}

/**
 * Generate dark-tinted wallpaper variants.
 */
async function generateDarkWallpapers(imageBuffer) {
  console.log('Generating dark wallpapers...');

  const darkBuffer = await createDarkVariant(imageBuffer, 0.5);

  for (const { name, width } of WALLPAPER_SIZES) {
    const outputPath = path.join(WALLPAPERS_DIR, `${name}-dark.webp`);
    await sharp(darkBuffer)
      .resize(width, undefined, {
        fit: 'cover',
        withoutEnlargement: true,
      })
      .webp({
        quality: 80,
        effort: 6,
      })
      .toFile(outputPath);
    console.log(`  ✓ ${name}-dark.webp (${width}px)`);
  }
}

/**
 * Generate a dominant-color palette sample from the image.
 */
async function generatePaletteSample(imageBuffer) {
  console.log('Generating palette sample...');

  // Extract 5 key colors using quantization
  const { data, info } = await sharp(imageBuffer)
    .resize(50, 50, { fit: 'cover' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const colorMap = new Map();

  for (let i = 0; i < data.length; i += 3) {
    const r = Math.round(data[i] / 16) * 16;
    const g = Math.round(data[i + 1] / 16) * 16;
    const b = Math.round(data[i + 2] / 16) * 16;
    const key = `${r},${g},${b}`;
    colorMap.set(key, (colorMap.get(key) || 0) + 1);
  }

  const sorted = [...colorMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, count]) => {
      const [r, g, b] = key.split(',').map(Number);
      const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
      return { rgb: { r, g, b }, hex, count };
    });

  console.log('\nTop 5 dominant colors:');
  sorted.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.hex} (${c.count} pixels)`);
  });

  return sorted;
}

/**
 * Main execution.
 */
async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Brutalist Chrome — Image Optimizer      ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // Validate source file
  if (!fs.existsSync(THEME_PNG)) {
    console.error(`✗ Source image not found: ${THEME_PNG}`);
    console.error('  Please ensure theme.png exists in the parent directory.');
    process.exit(1);
  }

  const stats = fs.statSync(THEME_PNG);
  console.log(`Source: theme.png (${(stats.size / 1024).toFixed(1)} KB)\n`);

  try {
    const imageBuffer = fs.readFileSync(THEME_PNG);

    // Analyze luminance
    const luminance = await getLuminance(imageBuffer);
    console.log(`Average luminance: ${luminance} (${luminance < 128 ? 'dark' : 'light'})\n`);

    // Generate all assets
    await generateIcons(imageBuffer);
    console.log('');
    await generateWallpapers(imageBuffer);
    console.log('');
    await generateDarkWallpapers(imageBuffer);
    console.log('');
    await generatePaletteSample(imageBuffer);

    console.log('\n✓ All images optimized successfully.');

    // Output manifest-ready icon paths
    console.log('\nIcon paths for manifest.json:');
    ICON_SIZES.forEach(size => {
      console.log(`  "${size}": "assets/icons/icon-${size}.png"`);
    });
  } catch (err) {
    console.error('\n✗ Optimization failed:', err.message);
    process.exit(1);
  }
}

main();
