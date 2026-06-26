/**
 * Brutalist Chrome — Build Script
 *
 * Copies source files to dist/, minifies CSS & JS,
 * generates the production-ready extension package.
 *
 * Usage:
 *   node scripts/build.js        # Production build
 *   node scripts/build.js --dev  # Development build (no minification)
 */

const fs = require('fs');
const path = require('path');
const CleanCSS = require('clean-css');
const UglifyJS = require('uglify-js');

const ROOT = path.resolve(__dirname, '..');
const SRC = ROOT;
const DIST = path.join(ROOT, 'dist');

const isDev = process.argv.includes('--dev');

// Files and directories to copy (relative to project root)
const COPY_TASKS = [
  'manifest.json',
  'theme',
  'assets',
  { src: 'extension/popup', dest: 'popup' },
  { src: 'newtab', dest: 'newtab' },
  { src: 'extension/sidebar', dest: 'sidebar' },
  { src: 'extension/options', dest: 'options' },
  { src: 'extension', dest: 'extension' },
  { src: 'docs', dest: 'docs' },
  { src: 'scripts', dest: 'scripts' },
  { src: 'package.json', dest: 'package.json' },
];

// File extensions to minify
const CSS_EXT = '.css';
const JS_EXT = '.js';
const HTML_EXT = '.html';

/**
 * Ensure a directory exists.
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Copy a file or directory recursively.
 */
function copy(src, dest) {
  if (!fs.existsSync(src)) return false;

  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    ensureDir(dest);
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      if (entry.startsWith('.')) continue;
      copy(
        path.join(src, entry),
        path.join(dest, entry),
      );
    }
    return true;
  }

  // Read, optionally minify, then write
  let content = fs.readFileSync(src, 'utf-8');
  const ext = path.extname(src).toLowerCase();

  if (!isDev) {
    if (ext === CSS_EXT) {
      const minified = new CleanCSS({
        level: 2,
        sourceMap: false,
        rebase: false,
      }).minify(content);
      if (minified.errors.length) {
        console.error(`CSS errors in ${src}:`, minified.errors);
      } else {
        content = minified.styles;
      }
    } else if (ext === JS_EXT) {
      const result = UglifyJS.minify(content, {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
        output: {
          comments: false,
        },
      });
      if (result.error) {
        console.error(`JS error in ${src}:`, result.error);
      } else {
        content = result.code;
      }
    }
  }

  ensureDir(path.dirname(dest));
  fs.writeFileSync(dest, content, 'utf-8');
  return true;
}

/**
 * Remove a directory recursively.
 */
function rmDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Get total size of a directory in bytes.
 */
function getDirSize(dir) {
  let total = 0;
  if (!fs.existsSync(dir)) return 0;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += getDirSize(fullPath);
    } else {
      total += fs.statSync(fullPath).size;
    }
  }
  return total;
}

/**
 * Format bytes to human-readable string.
 */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Main build function.
 */
async function main() {
  const startTime = Date.now();

  console.log('╔══════════════════════════════════════════╗');
  console.log(`║  Brutalist Chrome — Build${isDev ? ' (dev)' : ''}      ║`);
  console.log('╚══════════════════════════════════════════╝\n');

  // Clean dist directory
  console.log('Cleaning dist/...');
  rmDir(DIST);
  ensureDir(DIST);

  // Copy all files
  console.log('Copying files...');
  let copiedCount = 0;
  let skippedCount = 0;

  for (const task of COPY_TASKS) {
    let src, dest;
    if (typeof task === 'string') {
      src = path.join(SRC, task);
      dest = path.join(DIST, task);
    } else {
      src = path.join(SRC, task.src);
      dest = path.join(DIST, task.dest);
    }

    const result = copy(src, dest);
    if (result) {
      copiedCount++;
      const displayName = typeof task === 'string' ? task : `${task.src} → ${task.dest}`;
      console.log(`  ✓ ${displayName}`);
    } else {
      skippedCount++;
      const displayName = typeof task === 'string' ? task : task.src;
      console.log(`  - ${displayName} (not found)`);
    }
  }

  // Write build metadata
  const buildMeta = {
    version: require(path.join(ROOT, 'package.json')).version,
    buildTime: new Date().toISOString(),
    isDev,
    files: copiedCount,
    skipped: skippedCount,
  };

  fs.writeFileSync(
    path.join(DIST, 'build.json'),
    JSON.stringify(buildMeta, null, 2),
    'utf-8',
  );

  // Stats
  const elapsed = Date.now() - startTime;
  const distSize = getDirSize(DIST);

  console.log('\n═══════════════════════════════════════════');
  console.log(`  Files copied:     ${copiedCount}`);
  if (skippedCount > 0) console.log(`  Skipped:         ${skippedCount}`);
  console.log(`  Dist size:        ${formatBytes(distSize)}`);
  console.log(`  Build time:       ${elapsed}ms`);
  console.log(`  Mode:             ${isDev ? 'development' : 'production'}`);
  if (!isDev) {
    console.log('  Minification:     enabled');
  }
  console.log('═══════════════════════════════════════════\n');

  console.log(`Build complete → ${DIST}`);
}

main().catch(err => {
  console.error('\n✗ Build failed:', err.message);
  process.exit(1);
});
