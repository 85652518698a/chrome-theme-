/**
 * Brutalist Chrome — Zip Script
 *
 * Creates a production zip archive for Chrome Web Store upload.
 * Reads from dist/ and outputs to release/.
 *
 * Usage:
 *   node scripts/zip.js
 *
 * Dependencies: archiver
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist');
const RELEASE_DIR = path.join(ROOT, 'release');
const PACKAGE_JSON = path.join(ROOT, 'package.json');

/**
 * Ensure a directory exists.
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Format bytes to human-readable string.
 */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Get total size of a directory recursively.
 */
function getDirSize(dir) {
  let total = 0;
  if (!fs.existsSync(dir)) return total;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += getDirSize(fullPath);
    } else if (entry.isFile()) {
      total += fs.statSync(fullPath).size;
    }
  }
  return total;
}

/**
 * Main zip function.
 */
async function main() {
  const startTime = Date.now();

  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Brutalist Chrome — Zip Packager        ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // Validate dist directory
  if (!fs.existsSync(DIST_DIR)) {
    console.error('✗ dist/ directory not found.');
    console.error('  Run "node scripts/build.js" first.');
    process.exit(1);
  }

  // Read version from package.json
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf-8'));
  const version = pkg.version;
  const fileName = `brutalist-chrome-v${version}.zip`;
  const outputPath = path.join(RELEASE_DIR, fileName);

  // Ensure release directory exists
  ensureDir(RELEASE_DIR);

  // Create the zip archive
  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip', {
    zlib: { level: 9 },
    store: false,
  });

  output.on('close', () => {
    const elapsed = Date.now() - startTime;
    const distSize = getDirSize(DIST_DIR);
    const compressedSize = archive.pointer();

    console.log('═══════════════════════════════════════════');
    console.log(`  Version:          v${version}`);
    console.log(`  Source size:      ${formatBytes(distSize)}`);
    console.log(`  Archive size:     ${formatBytes(compressedSize)}`);
    console.log(`  Compression:      ${((1 - compressedSize / distSize) * 100).toFixed(1)}%`);
    console.log(`  Time:             ${elapsed}ms`);
    console.log('═══════════════════════════════════════════\n');

    // Check Chrome Web Store size limit (500 MB)
    if (compressedSize > 500 * 1024 * 1024) {
      console.warn('⚠  Warning: Archive exceeds 500 MB (Chrome Web Store limit).');
    }

    // Suggest max package size (~50 MB is recommended)
    if (compressedSize > 50 * 1024 * 1024) {
      console.warn('⚠  Warning: Archive exceeds 50 MB. Consider optimizing assets.');
    }

    console.log(`✓ Package created: ${outputPath}`);
  });

  archive.on('warning', (err) => {
    if (err.code === 'ENOENT') {
      console.warn('⚠  Warning:', err.message);
    } else {
      throw err;
    }
  });

  archive.on('error', (err) => {
    throw err;
  });

  // Pipe archive data to file
  archive.pipe(output);

  // Add dist contents to archive
  archive.directory(DIST_DIR, false);

  // Add metadata file
  archive.append(
    JSON.stringify(
      {
        name: 'brutalist-chrome',
        version,
        buildDate: new Date().toISOString(),
        description: 'Brutalist Chrome Extension & Theme',
      },
      null,
      2,
    ),
    { name: 'archive-info.json' },
  );

  // Finalize
  await archive.finalize();
}

main().catch(err => {
  console.error('\n✗ Zip failed:', err.message);
  process.exit(1);
});
