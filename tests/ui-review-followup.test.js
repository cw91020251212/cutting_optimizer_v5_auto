const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const html = readFileSync(new URL('../index.html', `file://${__filename}`), 'utf8');
const css = readFileSync(new URL('../desktop-workspace.css', `file://${__filename}`), 'utf8');
const js = readFileSync(new URL('../desktop-workspace.js', `file://${__filename}`), 'utf8');
const followupJs = readFileSync(new URL('../ui-review-followup.js', `file://${__filename}`), 'utf8');
const has = (text, pattern, message) => assert.ok(pattern.test(text), message);
const lacks = (text, pattern, message) => assert.ok(!pattern.test(text), message);

test('unit controls explain their scope and preserve three independent selectors', () => {
  for (const id of ['unit', 'globalCutUnit', 'globalMaterialUnit']) {
    has(html, new RegExp(`id="${id}"`), `missing selector ${id}`);
    has(html, new RegExp(`data-target-select="${id}"`), `missing trigger ${id}`);
  }
  has(followupJs, /Result display unit/, 'result display scope is not named');
  has(followupJs, /Cutting item unit/, 'cutting unit scope is not named');
  has(followupJs, /Material unit/, 'material unit scope is not named');
  has(followupJs, /Metric \(m \/ cm \/ mm\)/, 'metric units are not fully described');
  has(followupJs, /Imperial \(ft \/ in \/ eighths\)/, 'imperial units are not fully described');
});

test('auto-replenish is presented separately with a readable state and warning', () => {
  has(html, /id="autoReplenishSettingsRow"/, 'auto-replenish is still coupled to scheme management');
  has(html, /id="autoReplenishState"[^>]*role="status"/, 'replenish state is not announced');
  has(html, /id="autoReplenishWarning"[^>]*role="status"/, 'short-length warning is not visible/status announced');
  has(followupJs, /setAttribute\('aria-pressed', String\(enabled\)\)/, 'current enabled state is not exposed');
  has(followupJs, /function updateAutoReplenishWarning\(/, 'warning updater is missing');
});

test('settings card exposes existing font, theme and display-tuning actions', () => {
  for (const id of ['settingsFontIncreaseDirect', 'settingsFontDecreaseDirect', 'settingsThemeDirect', 'settingsTuneDirect']) {
    has(html, new RegExp(`id="${id}"`), `settings card is missing ${id}`);
  }
});

test('help is a single entry with examples reachable from the help dialog', () => {
  has(html, /id="helpExamplesButton"/, 'help dialog has no examples entry');
  has(followupJs, /helpExamples\.addEventListener[\s\S]{0,1000}showCaseHelp\(\)/, 'examples action is not wired from help');
  has(css, /#helpButton[\s\S]{0,180}display:\s*none\s*!important/, 'duplicate results help button remains visible');
  has(css, /#ag-case-help-btn[\s\S]{0,180}display:\s*none\s*!important/, 'duplicate examples button remains visible');
  has(css, /#settingsHelpButton[\s\S]{0,180}display:\s*none\s*!important/, 'duplicate settings help button remains visible');
});

test('mobile tools drawer contains language and scroll navigation and restores nodes on desktop', () => {
  has(js, /move\(document\.querySelector\('\.top-tools'\),\s*utilityRow\)/, 'desktop tool toolbar is not preserved');
  has(html, /drawer\.appendChild\(tools\)/, 'tools are not in the mobile drawer');
  has(html, /rememberAndMove\(languageToggle\)/, 'language control is not in the mobile drawer');
  has(html, /rememberAndMove\(scrollNav\)/, 'scroll controls are not in the mobile drawer');
  has(html, /__restoreStage1HeaderTools/, 'mobile controls have no restore hook');
  has(js, /__restoreStage1HeaderTools/, 'desktop transition does not restore mobile nodes');
});

test('forms align controls and result charts remain readable without changing cut geometry', () => {
  has(css, /\.controls-row \.ag-action-btn[^{}]*\{[^}]*min-height:\s*44px/i, 'action buttons do not meet the common hit target');
  has(css, /\.opt-material-box \.cut-bar-chart/, 'chart styling hook is missing');
  has(css, /\.opt-material-box \.cut-order[^{}]*\{[^}]*font-size:\s*14px/i, 'cut order remains too small');
  has(css, /\.cut-waste[^{}]*\{[^}]*background:\s*#e2e8f0/i, 'waste is not rendered with a clear neutral surface');
  has(html, /class="cut-segment"/, 'cut segments lack a styling/accessibility hook');
  has(html, /class="cut-waste"/, 'waste segment lacks a styling hook');
  has(html, /class="cut-order"/, 'cut order lacks a styling hook');
  has(html, /#1D4ED8.*#047857.*#C2410C.*#6D28D9.*#0E7490.*#BE185D.*#334155.*#4D7C0F/, 'distinct high-contrast palette is missing');
});

test('gradient style control exposes all existing modes as a segmented control', () => {
  has(html, /class="ag-gradient-controls"[^>]*role="group"/, 'gradient selector is not a grouped control');
  for (const mode of ['standard', 'metal', 'soft', 'flat']) {
    has(html, new RegExp(`data-gradient-mode="${mode}"`), `missing gradient mode ${mode}`);
  }
});

test('Chinese help/examples consistently call the entries cutting items and materials', () => {
  has(html, /切割項目區/, 'help does not use the standard cutting-item term');
  has(html, /材料區/, 'examples do not use the standard material term');
  lacks(html, /部件區|材料／物料區/, 'legacy mixed terms remain in user guidance');
  lacks(html, /受影響原料：|'原料長度'|材料長度不足：原料 #|有切件長度\(含鋸縫\)大於原料長度/, 'legacy raw-material wording remains in visible output');
});
