/**
 * Deterministic path rewrite for Cascade assets inside a single-Worker deployment.
 * Never edit the source Cascade app; transform the copied output only.
 */
export function rewriteCascadeText(text, name) {
  if (!/\.(?:html|css|js|mjs)$/i.test(name)) return text;
  let out = text
    .replaceAll('/static/', '/cascade/static/')
    .replaceAll('/api/', '/cascade/api/')
    .replaceAll("+'/play/'", "+'/cascade/play/'")
    .replaceAll('href="/demo"', 'href="/cascade/demo"')
    .replaceAll("location.href='/demo'", "location.href='/cascade/demo'")
    .replaceAll('href="/"', 'href="/cascade/"');
  if (name === 'cascade.js') {
    const oldHistory = "history.replaceState(null,'',`/${role==='host'?'host':'play'}/${code}`)";
    const newHistory = "history.replaceState(null,'',`/cascade/${role==='host'?'host':'play'}/${code}`)";
    if (!out.includes(oldHistory)) throw Error('Cascade room URL template changed');
    out = out.replace(oldHistory, newHistory);
    const routeLookup = 'location.pathname.match(';
    if (!out.includes(routeLookup)) throw Error('Cascade deep-link matcher changed');
    out = out.replace(routeLookup, "location.pathname.replace(/^\\/cascade(?=\\/|$)/,'').match(");
    out = out.replace("location.pathname==='/collection'", "location.pathname==='/cascade/collection'");
    const initTail = "else if(location.pathname==='/cascade/collection')root.innerHTML=collection();else root.innerHTML=landing();";
    const initTarget = "else if(location.pathname==='/cascade/collection')root.innerHTML=collection();else if(location.pathname==='/cascade/' && ['digital','physical'].includes(new URLSearchParams(location.search).get('mode')))await create(new URLSearchParams(location.search).get('mode'));else root.innerHTML=landing();";
    if (!out.includes(initTail)) throw Error('Cascade bootstrap branch changed');
    out = out.replace(initTail, initTarget);
  }
  return out;
}
