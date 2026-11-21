/** Package a complete, approved AGENT/FAULT voice pack, or publish an empty registry.
 * Recordings are never generated or downloaded during a production build.
 */
import { existsSync, readFileSync, mkdirSync, cpSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function prepareNarration(source, output) {
  const cues = JSON.parse(readFileSync(join(source, 'voice-cues.json'), 'utf8'));
  const keys = Object.entries(cues).flatMap(([edition, phases]) =>
    Object.keys(phases).map(phase => edition + '-' + phase));
  if (keys.length !== 20 || new Set(keys).size !== 20 || keys.some(k => !/^[a-z]+-[a-z_]+$/.test(k))) {
    throw Error('Invalid AGENT/FAULT voice cue manifest');
  }
  const dir = join(source, 'recordings');
  const present = keys.filter(key => existsSync(join(dir, key + '.mp3')));
  if (present.length !== 0 && present.length !== keys.length) {
    throw Error('Incomplete AGENT/FAULT narration pack. Missing: ' + keys.filter(k => !present.includes(k)).join(', '));
  }
  const target = join(output, 'shared-media', 'narration');
  mkdirSync(target, { recursive: true });
  const registry = {};
  for (const key of present) {
    const name = key + '.mp3';
    if (statSync(join(dir, name)).size < 1024) throw Error('Invalid narration recording: ' + name);
    cpSync(join(dir, name), join(target, name));
    registry[key] = '/shared-media/narration/' + name;
  }
  writeFileSync(join(target, 'voice-pack.js'), 'window.AGENT_FAULT_VOICE_PACK = Object.freeze(' + JSON.stringify(registry) + ');\n');
  console.log(present.length ? 'Packaged ' + present.length + ' recorded announcements.' : 'No approved recorded voice pack present; browser narration remains available.');
  return registry;
}
