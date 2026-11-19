/**
 * One Cloudflare Worker with four AGENT/FAULT experiences.
 * Rebuild both existing editions and publish a two-edition static asset bundle.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { rewriteCascadeText } from './unified-rewrite.mjs';

const hosted = resolve(fileURLToPath(new URL('..', import.meta.url)));
const cascade = resolve(hosted, '../cascade');
const output = join(hosted, 'unified-public');
const originalHostedIndex = readFileSync(join(hosted, 'public/index.html'), 'utf8');
const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: 'inherit' });

run(process.execPath, ['scripts/prepare-digital.mjs'], hosted);
run('npm', ['run', 'test'], hosted);
run('npm', ['run', 'check'], hosted);
run('npm', ['run', 'unified:check'], hosted);
run('npm', ['run', 'quality:check'], hosted);
run('npm', ['run', 'balance:check'], hosted);
// Cascade is independently packaged. Test and prepare its illustrated source as well.
run('npm', ['install', '--no-audit', '--no-fund'], cascade);
run('npm', ['run', 'build'], cascade);
run('npm', ['run', 'cloudflare:check'], cascade);

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
cpSync(join(hosted, 'public'), output, { recursive: true, force: true });
// The asset recovery step imports the original single-device game's index;
// restore the multiplayer Classic entry document when publishing this Worker.
writeFileSync(join(output, 'index.html'), originalHostedIndex);
const cascadeOut = join(output, 'cascade');
cpSync(join(cascade, 'public'), cascadeOut, { recursive: true, force: true });

function rewriteTree(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) { rewriteTree(p); continue; }
    if (!entry.isFile()) continue;
    if (!['.html','.css','.js','.mjs'].includes(extname(p).toLowerCase())) continue;
    const before = readFileSync(p, 'utf8');
    const after = rewriteCascadeText(before, entry.name);
    if (after !== before) writeFileSync(p, after);
  }
}
rewriteTree(cascadeOut);
for (const required of [
  'index.html', 'static/app.js', 'cascade/index.html',
  'cascade/static/cascade.js', 'cascade/static/assets/deck_data.json'
]) {
  if (!existsSync(join(output, required))) throw Error('Missing unified output asset: ' + required);
}
console.log('Unified AGENT/FAULT prepared: Classic + Cascade, each with digital and physical rooms.');
