import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { prepareNarration } from '../scripts/prepare-narration.mjs';

test('narration packaging supports browser fallback, rejects partial packs, and copies a complete pack', () => {
  const temp = mkdtempSync(join(tmpdir(), 'af-voice-'));
  const src = join(temp, 'source');
  const out = join(temp, 'output');
  mkdirSync(join(src, 'recordings'), {recursive:true});
  try {
    const manifest = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../../audio/narration/voice-cues.json');
    const cues = JSON.parse(readFileSync(manifest, 'utf8'));
    writeFileSync(join(src, 'voice-cues.json'), JSON.stringify(cues));
    const keys = Object.entries(cues).flatMap(([edition, phases]) =>
      Object.keys(phases).map(phase => edition + '-' + phase));
    assert.equal(keys.length, 20);
    assert.deepEqual(prepareNarration(src, out), {});
    assert.match(readFileSync(join(out, 'shared-media/narration/voice-pack.js'), 'utf8'), /freeze\(\{\}\)/);
    // Test fixture bytes only: real MP3 validation is performed before voice-pack approval.
    writeFileSync(join(src, 'recordings', keys[0] + '.mp3'), Buffer.alloc(2048));
    assert.throws(() => prepareNarration(src, out), /Incomplete AGENT\/FAULT narration pack/);
    for (const key of keys) writeFileSync(join(src, 'recordings', key + '.mp3'), Buffer.alloc(2048));
    const registry = prepareNarration(src, out);
    assert.equal(Object.keys(registry).length, 20);
    assert.equal(registry['classic-lobby'], '/shared-media/narration/classic-lobby.mp3');
    assert.equal(readFileSync(join(out, 'shared-media/narration/classic-lobby.mp3')).length, 2048);
  } finally { rmSync(temp, {recursive:true, force:true}); }
});
