/* Test page only: exact fixture responses, actual browser DOMParser/Image and ThemeLab. */
(() => {
  const root = new URL('../readiness-001/r1/fixtures/', document.baseURI);
  const originalFetch = window.fetch.bind(window);
  let current = null;
  window.fetch = (input, options) => {
    const url = new URL(input instanceof Request ? input.url : input, document.baseURI);
    if (current && url.pathname.endsWith('/theme/' + current.group + '-test.json')) {
      return originalFetch(new URL(current.manifest, root), options);
    }
    if (current && current.root !== 'baseline' && url.pathname.includes('/theme/test-assets/')) {
      return originalFetch(new URL(current.root + '/readiness-001/theme/test-assets/' + url.pathname.split('/').pop(), root), options);
    }
    return originalFetch(input, options);
  };
  const snapshot = () => JSON.stringify({context,active,tool,specialty,selectedObject,chosen,stage,expanded,carryTab,viewStack});
  const parameters = () => JSON.stringify([...document.querySelectorAll('[data-field]')].map(e => [e.dataset.field,e.value]));
  const result = document.getElementById('fixture-results');
  document.getElementById('fallback').onclick = async () => {
    const before = snapshot(); current = null;
    await Readiness.setTheme('baseline', ThemeLab.validate, snapshot, render);
    result.textContent = JSON.stringify({case:'fallback', theme:Readiness.getTheme(), contextPreserved:before===snapshot()}, null, 2);
  };
  document.getElementById('run-fixtures').onclick = async () => {
    const rows = [], button = document.getElementById('run-fixtures'); button.disabled = true;
    const cases = await (await originalFetch(new URL('cases.json', root))).json();
    for (const entry of cases) {
      current = entry;
      const before = snapshot(), fields = parameters(), theme = Readiness.getTheme();
      let actual = 'ACCEPT', errorType = null;
      try { await Readiness.setTheme(entry.group, ThemeLab.validate, snapshot, render); }
      catch (e) { actual = e.message; errorType = e.name; }
      const contextPreserved = before === snapshot(), parametersPreserved = fields === parameters();
      const rejectionAtomic = actual === 'ACCEPT' || Readiness.getTheme() === theme;
      rows.push({...entry, actual, errorType, contextPreserved, parametersPreserved, rejectionAtomic,
        pass:actual===entry.expected && contextPreserved && parametersPreserved && rejectionAtomic});
      result.textContent = JSON.stringify({kind:'NATIVE_BROWSER_SAME_FIXTURES', rows, pass:rows.every(r=>r.pass)},null,2);
    }
    current = null; button.disabled = false;
  };
})();
