const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const css = readFileSync(new URL('../desktop-workspace.css', `file://${__filename}`), 'utf8');
const js = readFileSync(new URL('../desktop-workspace.js', `file://${__filename}`), 'utf8');

test('desktop operations pane has enough width for its input cards', () => {
  assert.match(css, /--desktop-operations-width:\s*clamp\(420px,\s*35vw,\s*520px\)/);
});

test('empty desktop results give bilingual, screen-reader announced guidance', () => {
  assert.match(js, /desktop-empty-state/);
  assert.match(js, /aria-live/);
  assert.match(js, /加入切割項目與可用材料/);
  assert.match(js, /Add cutting items and available material/);
  assert.match(css, /#desktopResults:not\(\.has-results\) \.desktop-empty-state/);
  assert.match(css, /#desktopResults\.has-results \.desktop-empty-state/);
});

test('desktop quick tools remain visible with 40px targets', () => {
  assert.match(js, /move\(document\.querySelector\('\.top-tools'\),\s*utilityRow\)/);
  assert.match(css, /#desktopOperations[^{}]*\.top-tools[^{}]*\.tool-btn[^{}]*\{[^}]*40px/);
});

test('material table fits inside the widened operations pane', () => {
  assert.match(css, /#materialItemsTable\s*\{[^}]*min-width:\s*0\s*!important/);
  assert.match(css, /#materialItemsTable\s*\{[^}]*width:\s*100%/);
});

test('desktop controls use calmer surfaces and button elevation', () => {
  assert.match(css, /#desktopOperations \.card,\s*html\.desktop-workspace body:not\(\.sepia-mode\) #desktopResults #results-card\s*\{[^}]*background:\s*#f8fafc/i);
  assert.match(css, /box-shadow:\s*0 1px 3px rgba\(15, 23, 42, \.16\)/i);
  assert.match(css, /#desktopOperations \.btn::before[\s\S]*?display:\s*none\s*!important/);
  assert.match(css, /html\.desktop-workspace body #desktopOperations \.btn:not\(\.btn-close\):not\(\.tool-btn\):not\(#languageToggle\)/);
});

test('mobile page reserves bottom space for fixed controls', () => {
  assert.match(css, /@media screen and \(max-width:\s*767\.98px\)/);
  assert.match(css, /padding-bottom:\s*calc\(80px \+ env\(safe-area-inset-bottom(?:,\s*0px)?\)\)/);
});

test('desktop primary action and Color Legend share the blue hierarchy', () => {
  assert.match(css, /#desktopCommandCard #calculateButton\s*\{[^}]*background:\s*#2563eb/i);
  assert.match(css, /#desktopResults #colorLegend > h4\s*\{[^}]*background:\s*linear-gradient\(90deg, #1d4ed8, #3b82f6\)/i);
});

test('desktop result KPIs and material statuses remain readable', () => {
  assert.match(css, /#desktopResults \.opt-summary-box > div\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit, minmax\(170px, 1fr\)\)/i);
  assert.match(css, /#desktopResults \.opt-summary-box > div > div > strong\s*\{[^}]*font-size:\s*14px/i);
  assert.match(css, /\.mclass-badge\.mclass-scrap\s*\{[^}]*background:\s*#f1f5f9/i);
  assert.match(css, /#materialItemsTable td:nth-child\(4\) span\s*\{[^}]*font-size:\s*16px/i);
});
