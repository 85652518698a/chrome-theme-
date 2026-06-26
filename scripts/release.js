/**
 * Brutalist Chrome — Release Script
 *
 * Bumps version, builds, zips, and creates a release.
 * Supports semantic versioning: patch, minor, major.
 *
 * Usage:
 *   node scripts/release.js           # Interactive (default: patch)
 *   node scripts/release.js --patch   # 1.0.0 → 1.0.1
 *   node scripts/release.js --minor   # 1.0.0 → 1.1.0
 *   node scripts/release.js --major   # 1.0.0 → 2.0.0
 *   node scripts/release.js --version 1.2.3  # Specific version
 *   node scripts/release.js --dry-run # Preview only
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PACKAGE_JSON = path.join(ROOT, 'package.json');
const MANIFEST_JSON = path.join(ROOT, 'manifest.json');

const RELEASE_TYPES = ['patch', 'minor', 'major'];

/**
 * Bump a semver string by the given type.
 */
function bumpVersion(current, type) {
  const parts = current.split('.').map(Number);

  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid semver: ${current}`);
  }

  let [major, minor, patch] = parts;

  switch (type) {
    case 'major':
      major += 1;
      minor = 0;
      patch = 0;
      break;
    case 'minor':
      minor += 1;
      patch = 0;
      break;
    case 'patch':
    default:
      patch += 1;
      break;
  }

  return `${major}.${minor}.${patch}`;
}

/**
 * Parse command-line arguments.
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const flags = {
    type: 'patch',
    version: null,
    dryRun: false,
  };

  for (const arg of args) {
    if (arg === '--dry-run' || arg === '--dry') {
      flags.dryRun = true;
    } else if (arg.startsWith('--version=')) {
      flags.version = arg.split('=')[1];
    } else if (arg.startsWith('--version')) {
      const idx = args.indexOf(arg);
      if (idx + 1 < args.length && !args[idx + 1].startsWith('--')) {
        flags.version = args[idx + 1];
      }
    } else if (arg.startsWith('--')) {
      const type = arg.replace('--', '');
      if (RELEASE_TYPES.includes(type)) {
        flags.type = type;
      }
    }
  }

  return flags;
}

/**
 * Update version in package.json.
 */
function updatePackageJson(version) {
  const content = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf-8'));
  content.version = version;
  fs.writeFileSync(PACKAGE_JSON, JSON.stringify(content, null, 2) + '\n', 'utf-8');
  return content;
}

/**
 * Update version in manifest.json.
 */
function updateManifestJson(version) {
  if (!fs.existsSync(MANIFEST_JSON)) return;

  const content = JSON.parse(fs.readFileSync(MANIFEST_JSON, 'utf-8'));
  content.version = version;
  content.version_name = version;
  fs.writeFileSync(MANIFEST_JSON, JSON.stringify(content, null, 2) + '\n', 'utf-8');
}

/**
 * Log a colored status message.
 */
function log(label, message, color = '') {
  const prefix = {
    info: 'ℹ',
    ok: '✓',
    warn: '⚠',
    error: '✗',
    step: '→',
  }[label] || '•';

  console.log(`  ${prefix} ${message}`);
}

/**
 * Main release function.
 */
async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Brutalist Chrome — Release Manager     ║');
  console.log('╚══════════════════════════════════════════╝\n');

  const flags = parseArgs();

  // Read current version
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf-8'));
  const currentVersion = pkg.version;

  // Determine new version
  let newVersion;
  if (flags.version) {
    newVersion = flags.version;
    log('info', `Using specified version: v${newVersion}`);
  } else {
    newVersion = bumpVersion(currentVersion, flags.type);
    log('info', `${flags.type} bump: v${currentVersion} → v${newVersion}`);
  }

  // Validate version format
  if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
    log('error', `Invalid version format: "${newVersion}". Expected semver (e.g., 1.2.3).`);
    process.exit(1);
  }

  console.log('');

  // Dry run — preview only
  if (flags.dryRun) {
    log('step', 'Dry run — no files will be modified\n');
    console.log('  Changes preview:');
    console.log(`    package.json:   "version": "${currentVersion}" → "${newVersion}"`);
    console.log(`    manifest.json:  "version": "${currentVersion}" → "${newVersion}"`);

    if (fs.existsSync(path.join(ROOT, 'dist'))) {
      console.log('    Build:          skipped (use --dry-run with actual release)');
    }

    console.log('\n  Run without --dry-run to apply.');
    process.exit(0);
  }

  // Confirm
  console.log(`  Current version:  v${currentVersion}`);
  console.log(`  New version:      v${newVersion}`);
  console.log(`  Release type:     ${flags.version ? 'custom' : flags.type}`);
  console.log('');

  // Step 1: Update package.json
  log('step', 'Updating package.json...');
  updatePackageJson(newVersion);
  log('ok', `version → "${newVersion}"`);

  // Step 2: Update manifest.json
  if (fs.existsSync(MANIFEST_JSON)) {
    log('step', 'Updating manifest.json...');
    updateManifestJson(newVersion);
    log('ok', `version → "${newVersion}"`);
  } else {
    log('warn', 'manifest.json not found, skipping');
  }

  console.log('');

  // Step 3: Run build
  log('step', 'Running build...');
  const buildResult = await new Promise((resolve) => {
    const { spawn } = require('child_process');
    const build = spawn('node', [path.join(ROOT, 'scripts', 'build.js')], {
      cwd: ROOT,
      stdio: 'inherit',
    });
    build.on('close', (code) => resolve(code === 0));
  });

  if (!buildResult) {
    log('error', 'Build failed — release aborted.');
    process.exit(1);
  }
  log('ok', 'Build complete');

  // Step 4: Run zip
  log('step', 'Packaging zip...');
  const zipResult = await new Promise((resolve) => {
    const { spawn } = require('child_process');
    const zip = spawn('node', [path.join(ROOT, 'scripts', 'zip.js')], {
      cwd: ROOT,
      stdio: 'inherit',
    });
    zip.on('close', (code) => resolve(code === 0));
  });

  if (!zipResult) {
    log('error', 'Zip failed — release aborted.');
    process.exit(1);
  }
  log('ok', 'Zip complete');

  console.log('\n═══════════════════════════════════════════');
  console.log(`  Release v${newVersion} ready`);
  console.log('═══════════════════════════════════════════\n');

  // Output available artifacts
  const releaseDir = path.join(ROOT, 'release');
  if (fs.existsSync(releaseDir)) {
    const files = fs.readdirSync(releaseDir)
      .filter(f => f.endsWith('.zip'))
      .map(f => `  release/${f}`);

    if (files.length) {
      console.log('Artifacts:');
      files.forEach(f => console.log(`  ✓ ${f}`));
      console.log('');
    }
  }

  console.log('Next steps:');
  console.log('  1. Upload to Chrome Web Store Developer Dashboard');
  console.log('  2. Tag the release in git:');
  console.log(`     git tag v${newVersion}`);
  console.log('     git push origin v${newVersion}');
  console.log('');
}

main().catch(err => {
  console.error('\n✗ Release failed:', err.message);
  process.exit(1);
});
