/**
 * Curated Cloudflare Pages publisher for the GreenKappa Labs static website.
 * Only approved public web assets are copied into dist/.
 * Never copy the repository root directly: it contains server code, tests,
 * workflows, and development artifacts that must remain private to the repo.
 *
 * Usage: node scripts/build-cloudflare-pages.mjs
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const output = join(root, 'dist');
const fileLimit = 25 * 1024 * 1024; // Cloudflare Pages static asset limit.

const rootFiles = [
  'index.html', '404.html', 'privacy.html', 'robots.txt',
  'sitemap.xml', 'site.webmanifest', 'style.css', 'studio.css',
  'script.js', 'arcana-config.js', 'arcana-widget.js'
];
const publicDirectories = [
  'assets', 'card-games', 'courtflow', 'filingproof', 'flowglass',
  'journal', 'playground', 'tablearc', 'tablearc-red', 'tools', 'work', 'worlds'
];

// Backend and developer-only directories are never included in public output.
const excludedDirectories = new Set([
  '.github', '.git', 'node_modules', 'tests', '__tests__',
  'game-app', 'benchmark', 'source', 'scripts', 'netlify',
  'database', 'migrations', 'experiments', 'fixtures', 'coverage', 'dist'
]);
const extensions = new Set([
  '.html', '.css', '.js', '.svg', '.png', '.jpg', '.jpeg', '.gif',
  '.webp', '.avif', '.ico', '.woff', '.woff2', '.ttf', '.otf',
  '.mp4', '.webm', '.pdf', '.webmanifest'
]);
let filesCopied = 0;
let bytesCopied = 0;

function copyPublicFile(sourceRelative) {
  const source = join(root, sourceRelative);
  if (!existsSync(source)) throw new Error('Missing website file: ' + sourceRelative);
  const size = statSync(source).size;
  if (size > fileLimit) throw new Error('Cloudflare Pages 25 MiB asset limit exceeded: ' + sourceRelative);
  const target = join(output, sourceRelative);
  mkdirSync(resolve(target, '..'), { recursive: true });
  copyFileSync(source, target);
  filesCopied++;
  bytesCopied += size;
}

function copyDirectory(relativeDirectory) {
  const absolute = join(root, relativeDirectory);
  if (!existsSync(absolute)) throw new Error('Missing expected public directory: ' + relativeDirectory);
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    // Never follow symlinks into other project directories.
    if (entry.isSymbolicLink() || entry.name.startsWith('.')) continue;
    const relativePath = join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      if (!excludedDirectories.has(entry.name)) copyDirectory(relativePath);
      continue;
    }
    if (!entry.isFile() || !extensions.has(extname(entry.name).toLowerCase())) continue;
    if (/\.(?:test|spec)\.[cm]?js$/i.test(entry.name)) continue;
    copyPublicFile(relativePath);
  }
}

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
for (const file of rootFiles) copyPublicFile(file);
for (const dir of publicDirectories) copyDirectory(dir);

for (const required of [
  'index.html', 'assets/greenkappa-logo.png',
  'card-games/agent-fault/index.html', 'tools/index.html'
]) {
  if (!existsSync(join(output, required))) throw new Error('Required public page missing: ' + required);
}
for (const forbidden of [
  '.github', 'card-games/agent-fault/game-app',
  'card-games/agent-fault/benchmark', 'tests', 'README.md', 'CNAME'
]) {
  if (existsSync(join(output, forbidden))) throw new Error('Unsafe path in output: ' + forbidden);
}

console.log('Prepared ' + filesCopied + ' public files (' +
  (bytesCopied / 1024 / 1024).toFixed(1) + ' MiB) in dist/.');
console.log('Server code, credentials, development files, and GitHub workflows were excluded.');
