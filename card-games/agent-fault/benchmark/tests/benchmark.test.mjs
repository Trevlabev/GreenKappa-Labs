import test from 'node:test';
import assert from 'node:assert/strict';
import {cards,fixtures,cardsByVariant,promptFor,parseCandidates,validateFixtures,extractText} from '../shared/benchmark.mjs';

test('each manifest retains precisely 50 unique cards with identical ids',()=>{
 const x=Object.keys(cardsByVariant);
 assert.deepEqual(x.sort(),['baseline','challenger']);
 const ids=Object.keys(cardsByVariant.baseline);
 assert.equal(cards.length,50);
 assert.equal(new Set(ids).size,50);
 assert.deepEqual(ids.sort(),Object.keys(cardsByVariant.challenger).sort());
});
test('16 paired fixtures cover all 36 cards',()=>{
 assert.equal(fixtures.length,16);
 assert.deepEqual(validateFixtures().errors,[]);
});
test('scoring criteria are withheld from model prompts',()=>{
 for(const f of fixtures)for(const v of ['baseline','challenger']){
  const p=promptFor(f.fixtureId,v);
  assert(!p.input.includes(p.scenario.breakpoint_a));
  assert(!p.input.includes(p.scenario.breakpoint_b));
  assert(!p.input.includes('FAULT CONDITION:'));
  assert.equal(p.candidates.length,4);
 }
});
test('parses lettered responses, ignores unlabeled introduction',()=>{
 const p=parseCandidates('Intro\nA: Yes\nB) Two words\nC. Third\nD - Fourth');
 assert.equal(Object.keys(p).length,4);
 assert.equal(p.B.raw,'Two words');
 assert.equal(p.A.wordCount,1);
});
test('correctly extracts Responses API content',()=>{
 const o={output:[{content:[{type:'output_text',text:'A: hi\nB: there'}]}]};
 assert.equal(extractText(o),'A: hi\nB: there');
});
