/**
 * Renames Electron.app → Heartless.app in-place (moves the folder) and
 * patches Info.plist + binary name so macOS dock shows "Heartless".
 *
 * The electron package resolves the binary path dynamically, so we
 * also patch node_modules/electron/index.js to point to the new path.
 */
import {
  readFileSync, writeFileSync, existsSync, renameSync, copyFileSync, chmodSync,
} from 'fs';
import { resolve } from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

if (process.platform !== 'darwin') {
  console.log('✓ Skipping Electron.app patch on non-macOS platforms');
  process.exit(0);
}

const electronPkg   = resolve(root, 'node_modules/electron');
const distDir       = resolve(electronPkg, 'dist');
const electronApp   = resolve(distDir, 'Electron.app');
const heartlessApp  = resolve(distDir, 'Heartless.app');

// 1. Rename the .app folder itself (this is what the dock reads)
if (existsSync(electronApp) && !existsSync(heartlessApp)) {
  renameSync(electronApp, heartlessApp);
  console.log('✓ Renamed Electron.app → Heartless.app');
} else if (existsSync(heartlessApp)) {
  console.log('✓ Heartless.app already exists');
} else {
  // Non-fatal: this script only improves the dev dock name. Exiting non-zero
  // from postinstall would fail the whole `yarn install` — including on CI,
  // where the binary may not be unpacked yet.
  console.warn('⚠ Electron.app not found — skipping dock rename');
  process.exit(0);
}

const macOSDir  = resolve(heartlessApp, 'Contents/MacOS');
const plistPath = resolve(heartlessApp, 'Contents/Info.plist');
const oldBin    = resolve(macOSDir, 'Electron');
const newBin    = resolve(macOSDir, 'Heartless');

// 2. Rename binary inside the bundle
if (existsSync(oldBin) && !existsSync(newBin)) {
  renameSync(oldBin, newBin);
  chmodSync(newBin, 0o755);
  console.log('✓ Binary renamed → Heartless');
} else if (existsSync(newBin)) {
  console.log('✓ Binary already named Heartless');
}

// 3. Patch Info.plist
let plist = readFileSync(plistPath, 'utf-8');
const patches = [
  [/<key>CFBundleDisplayName<\/key>\s*<string>[^<]*<\/string>/, '<key>CFBundleDisplayName</key>\n\t<string>Heartless</string>'],
  [/<key>CFBundleName<\/key>\s*<string>[^<]*<\/string>/,        '<key>CFBundleName</key>\n\t<string>Heartless</string>'],
  [/<key>CFBundleExecutable<\/key>\s*<string>[^<]*<\/string>/,  '<key>CFBundleExecutable</key>\n\t<string>Heartless</string>'],
];
let changed = false;
for (const [re, val] of patches) {
  const next = plist.replace(re, val);
  if (next !== plist) { plist = next; changed = true; }
}
if (changed) { writeFileSync(plistPath, plist); console.log('✓ Info.plist patched'); }
else console.log('✓ Info.plist already patched');

// 4. Patch path.txt so require('electron') returns the new binary path
const pathTxt = resolve(electronPkg, 'path.txt');
const currentPath = readFileSync(pathTxt, 'utf-8').trim();
const newPath = 'Heartless.app/Contents/MacOS/Heartless';
if (currentPath !== newPath) {
  writeFileSync(pathTxt, newPath);
  console.log('✓ path.txt patched → Heartless');
} else {
  console.log('✓ path.txt already patched');
}
