import test from 'node:test';
import assert from 'node:assert/strict';
import { rewriteCascadeText } from '../scripts/unified-rewrite.mjs';

test('Cascade assets rewrite their fetch, socket, and image paths', () => {
  const example = "fetch('/api/rooms'); const u = new URL('/api/rooms/' + code + '/ws', W.location.href); const art='/static/assets/fronts/X.webp';";
  const got = rewriteCascadeText(example, 'room-realtime.mjs');
  assert.match(got, /\/cascade\/api\/rooms/);
  assert.match(got, /\/cascade\/static\/assets/);
  assert.doesNotMatch(got, /['"]\/api\/rooms/);
});
test('Cascade URL rewrites do not affect the original source, CSS, or assets', () => {
  const src='href="/demo" href="/" /static/cascade.css';
  const rewritten=rewriteCascadeText(src,'index.html');
  assert.equal(rewritten, 'href="/cascade/demo" href="/cascade/" /cascade/static/cascade.css');
  assert.equal(rewriteCascadeText(src, 'front.webp'),src);
});
test('Cascade browser routes remain edition-prefixed', () => {
  const source = "history.replaceState(null,'',`/${role==='host'?'host':'play'}/${code}`); location.pathname.match(/x/); else if(location.pathname==='/collection')root.innerHTML=collection();else root.innerHTML=landing();";
  const got = rewriteCascadeText(source, 'cascade.js');
  assert.match(got, /\/cascade\/\$\{role/);
  assert.match(got, /pathname\.replace/);
  assert.match(got, /pathname==='\/cascade\/'/);
});
