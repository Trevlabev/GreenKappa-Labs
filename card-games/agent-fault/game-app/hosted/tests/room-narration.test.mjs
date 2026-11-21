import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import { rewriteCascadeText } from '../scripts/unified-rewrite.mjs';

const hosted = resolve(fileURLToPath(new URL('..', import.meta.url)));
const cascade = resolve(hosted, '../cascade');
const read = (dir, file) => readFileSync(resolve(dir, file), 'utf8');

test('both game room entrypoints mount a dedicated local narrator', () => {
  for (const dir of [hosted, cascade]) {
    assert.match(read(dir, 'public/index.html'), /src="\/static\/room-narration\.mjs"/);
    const narrator = read(dir, 'public/static/room-narration.mjs');
    new Script(narrator);
    assert.match(narrator, /let enabled = false;/, 'Narration must be opt-in');
    assert.match(narrator, /if \(!supported \|\| !enabled \|\| !latest \|\| document\.hidden\) return;/);
    assert.match(narrator, /synth\.speak\(utterance\)/);
    assert.match(narrator, /window\.addEventListener\(EVENTS\.phase/);
    assert.doesNotMatch(narrator, /fetch\(|XMLHttpRequest|WebSocket/, 'Narrator should use local TTS only');
  }
  assert.equal(read(hosted, 'public/static/room-narration.mjs'),
    read(cascade, 'public/static/room-narration.mjs'),
    'The two rule editions should share exactly one announcer policy');
});

test('all documented Classic and Cascade game stages have safe, static scripts', () => {
  const narrator = read(hosted, 'public/static/room-narration.mjs');
  const phases = {
    classic: ['lobby','setup','submit','generate','spotlight','adjudicate','review','results','finished'],
    cascade: ['lobby','setup','baseline','lock_cards','cascade','handoff','judging','challenge','vote','results','finished']
  };
  for (const [edition, stages] of Object.entries(phases)) {
    assert.match(narrator, new RegExp(edition + ': Object\\.freeze\\(\\{'));
    for (const phase of stages) assert.match(narrator,
      new RegExp('(?:^|\\n)\\s*' + phase + ': '),
      edition + ' narration missing phase ' + phase);
  }
  assert.doesNotMatch(narrator, /detail\.?(?:fault|hand|cards|profile|timeline|message|token|prompt|name)/,
    'Narrator must not inspect private room data');
});

test('game state clients emit only public game metadata', () => {
  const classic = read(hosted, 'public/static/app.js');
  const casc = read(cascade, 'public/static/cascade.js');
  assert.match(classic, /new CustomEvent\('agent-fault:phase'/);
  assert.match(casc, /new CustomEvent\('agent-fault:phase'/);
  assert.match(classic, /detail:\{edition:'classic',room:s\.code,round:s\.round,phase:s\.phase,role:s\.me\.role\}/);
  assert.match(casc, /detail:\{edition:'cascade',room:s\.code,round:s\.round,phase:s\.phase,role:s\.me\.role,currentIndex:s\.current_index\}/);
});

test('soundtrack ducks and restores volume around narration', () => {
  for (const dir of [hosted, cascade]) {
    const music = read(dir, 'public/static/room-music.mjs');
    assert.match(music, /agent-fault:narration-start/);
    assert.match(music, /agent-fault:narration-end/);
    assert.match(music, /preferredVolume \* \(narrationActive \? 0\.25 : 1\)/);
    assert.match(music, /localStorage\.setItem\(VOLUME_KEY, String\(preferredVolume\)\)/);
  }
});

test('unified Worker rewrites the Cascade narrator entry without changing shared media paths', () => {
  const html = rewriteCascadeText(read(cascade, 'public/index.html'), 'index.html');
  assert.match(html, /src="\/cascade\/static\/room-narration\.mjs"/);
  const narrator = rewriteCascadeText(read(cascade, 'public/static/room-narration.mjs'), 'room-narration.mjs');
  assert.equal(narrator, read(cascade, 'public/static/room-narration.mjs'));
});
