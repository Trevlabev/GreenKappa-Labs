import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtures,cardsByVariant,parseCandidates} from '../shared/benchmark.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Importing the production file would execute paid calls. This test reads it
// as text to assert safety preconditions, and mirrors the locked-prompt logic.
const source=fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)),'../scripts/run-validation.mjs'),'utf8');
const workflow=fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)),'../../../../.github/workflows/agent-fault-validation-once.yml'),'utf8');

test('one-shot paid runner has a strictly bounded 192-request cap',()=>{
 assert.match(source,/MAX_POSSIBLE_CALLS=16\*2\*3\*2/);
 assert.match(source,/REPEATS!==3/);
 assert.match(source,/GITHUB_EVENT_NAME!=='push'/);
});
test('full benchmark locks original scenario text and both judging rules',()=>{
 assert.match(source,/const sc=baseLookup\[f\.scenarioId\]/);
 assert.match(source,/breakpointA:b\.breakpoint_a,breakpointB:b\.breakpoint_b,fault:fb\.condition/);
 assert.match(source,/breakpointA:c\.breakpoint_a,breakpointB:c\.breakpoint_b,fault:fc\.condition/);
});
test('workflow only triggers for exact manual once-only release commit',()=>{
 assert.match(workflow,/github\.event\.head_commit\.message == '\[AGENT-FAULT\] Execute controlled one-shot 3x validation'/);
 assert.match(workflow,/github\.run_attempt == 1/);
 assert.doesNotMatch(workflow,/workflow_dispatch:/);
 assert.doesNotMatch(workflow,/schedule:/);
});
test('all fixture pairings are identical in ID, profile, and secret Fault',()=>{
 assert.equal(fixtures.length,16);
 for(const f of fixtures){
  assert.equal(f.interferenceIds.length,4);
  for(const id of f.interferenceIds){assert.ok(cardsByVariant.baseline[id]);assert.ok(cardsByVariant.challenger[id]);}
 }
});
