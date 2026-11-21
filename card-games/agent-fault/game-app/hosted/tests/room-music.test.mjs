import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import { rewriteCascadeText } from '../scripts/unified-rewrite.mjs';

const hosted = resolve(fileURLToPath(new URL('..', import.meta.url)));
const cascade = resolve(hosted, '../cascade');
const music = '/shared-media/agent-fault-main-theme.mp3';

test('the deployed soundtrack is the real MP3 stored in this repository', () => {
  const asset = resolve(hosted, '../../audio/agent-fault-main-theme.mp3');
  assert.ok(statSync(asset).size > 1_000_000, 'Expected the mastered MP3, not an empty placeholder');
});

test('both room editions include the opt-in soundtrack control', () => {
  const clients = [
    [hosted, 'Classic'],
    [cascade, 'Cascade']
  ];
  const scripts = [];
  for (const [dir, edition] of clients) {
    const html = readFileSync(resolve(dir, 'public/index.html'), 'utf8');
    assert.match(html, /src="\/static\/room-music\.mjs"/, edition + ' must load its music controller');
    const client = readFileSync(resolve(dir, 'public/static/room-music.mjs'), 'utf8');
    new Script(client, { filename: edition + '/room-music.mjs' });
    assert.ok(client.includes(music), edition + ' must use the Worker-hosted audio path');
    assert.match(client, /audio\.preload = 'none'/, edition + ' must not fetch before interaction');
    assert.match(client, /toggle\.addEventListener\('click'/, edition + ' must require a user gesture');
    assert.match(client, /document\.hidden\) audio\.pause\(\)/, edition + ' must pause in background');
    scripts.push(client);
  }
  assert.equal(scripts[0], scripts[1], 'Classic and Cascade must have the same player');
});

test('the unified asset rewriting preserves both editions and shared soundtrack URL', () => {
  const cascadeHtml = readFileSync(resolve(cascade, 'public/index.html'), 'utf8');
  const result = rewriteCascadeText(cascadeHtml, 'index.html');
  assert.match(result, /src="\/cascade\/static\/room-music\.mjs"/);
  const player = readFileSync(resolve(cascade, 'public/static/room-music.mjs'), 'utf8');
  assert.ok(rewriteCascadeText(player, 'room-music.mjs').includes(music));
});
