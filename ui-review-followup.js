/* Follow-up UI only: keep calculation and saved project data untouched. */
(function () {
  'use strict';
  var byId = function (id) { return document.getElementById(id); };
  var lang = function () { return byId('language') && byId('language').value === 'en' ? 'en' : 'zh'; };
  var isEn = function () { return lang() === 'en'; };
  var unitNames = {
    metric: { zh: '公制', en: 'Metric' },
    imperial: { zh: '英制', en: 'Imperial' },
    imperial_decimal: { zh: '英制（十進）', en: 'Imperial (decimal display)' }
  };
  var unitDetails = {
    metric: { zh: '公制（米／厘米／毫米）', en: 'Metric (m / cm / mm)' },
    imperial: { zh: '英制（尺／寸／分）', en: 'Imperial (ft / in / eighths)' },
    imperial_decimal: { zh: '英制十進顯示（尺／寸）', en: 'Imperial decimal display (ft / in)' }
  };
  var unitScopes = {
    unit: { zh: '結果顯示單位', en: 'Result display unit' },
    globalCutUnit: { zh: '切割項目單位', en: 'Cutting item unit' },
    globalMaterialUnit: { zh: '材料單位', en: 'Material unit' }
  };

  function updateUnitTriggers() {
    ['unit', 'globalCutUnit', 'globalMaterialUnit'].forEach(function (id) {
      var select = byId(id), trigger = document.querySelector('[data-target-select="' + id + '"]');
      if (!select || !trigger) return;
      var current = unitNames[select.value] || unitNames.metric;
      var scope = unitScopes[id] || unitScopes.unit;
      var text = scope[lang()] + ': ' + current[lang()];
      trigger.setAttribute('aria-label', text);
      trigger.setAttribute('title', text);
      trigger.setAttribute('aria-controls', 'unitPickerModal');
    });
  }

  function updateUnitDialog(scopeId) {
    var scope = unitScopes[scopeId] || unitScopes.unit;
    var title = byId('unitPickerModalLabel');
    if (title) title.textContent = scope[lang()];
    document.querySelectorAll('#unitPickerModal [data-unit-value]').forEach(function (button) {
      var value = button.getAttribute('data-unit-value');
      var detail = unitDetails[value];
      var name = unitNames[value];
      if (!detail || !name) return;
      var spans = button.querySelectorAll('span');
      if (spans[0]) spans[0].textContent = name[lang()];
      if (spans[1]) spans[1].textContent = detail[lang()];
      button.setAttribute('aria-label', name[lang()] + ' — ' + detail[lang()]);
    });
  }

  function updateAutoReplenishState() {
    var button = byId('autoReplenishPickerBtn'), state = byId('autoReplenishState');
    if (!button) return;
    var checkbox = byId('autoReplenishToggle');
    var enabled = checkbox ? checkbox.checked : false;
    var length = 0;
    try { length = Number(typeof window.getAutoReplenishLength === 'function' ? window.getAutoReplenishLength(6000) : 0); } catch (_) {}
    if (!Number.isFinite(length) || length < 0) length = 0;
    var mm = Math.round(length).toLocaleString(isEn() ? 'en-US' : 'zh-Hant-HK');
    var stateText = enabled
      ? (isEn() ? 'On · stock length ' + mm + ' mm' : '已啟用 · 標準長度 ' + mm + ' 毫米')
      : (isEn() ? 'Off · previous length is kept' : '已關閉 · 保留上次長度');
    if (state) state.textContent = stateText;
    button.setAttribute('aria-pressed', String(enabled));
    button.setAttribute('aria-label', (isEn() ? 'Auto-replenish settings: ' : '自動補料設定：') + stateText);
    button.title = button.getAttribute('aria-label');
    var title = byId('autoReplenishTitleMain');
    if (title) title.textContent = isEn() ? 'Auto-replenish' : '自動補料';
    var description = byId('autoReplenishDescription');
    if (description) description.textContent = isEn()
      ? 'Choose a standard stock length. Turning it off keeps your last selection.'
      : '選擇標準補料長度；關閉時會保留上次選擇。';
  }

  function updateAutoReplenishWarning() {
    var warning = byId('autoReplenishWarning');
    if (!warning) return;
    var button = byId('autoReplenishPickerBtn'), enabled = button && button.getAttribute('aria-pressed') === 'true';
    var length = 0, maxCut = 0;
    try { length = Number(typeof window.getAutoReplenishLength === 'function' ? window.getAutoReplenishLength(6000) : 0); } catch (_) {}
    try {
      (typeof window.getCuttingItems === 'function' ? window.getCuttingItems() : []).forEach(function (item) {
        var value = Number(item && item.length);
        if (Number.isFinite(value) && value > maxCut) maxCut = value;
      });
    } catch (_) {}
    var tooShort = enabled && length > 0 && maxCut > 0 && length + 1e-9 < maxCut;
    warning.hidden = !tooShort;
    if (!tooShort) { warning.textContent = ''; return; }
    var lenText = Math.round(length).toLocaleString(isEn() ? 'en-US' : 'zh-Hant-HK');
    var cutText = Math.round(maxCut).toLocaleString(isEn() ? 'en-US' : 'zh-Hant-HK');
    warning.textContent = isEn()
      ? 'Auto-replenish length (' + lenText + ' mm) is shorter than the longest cutting item (' + cutText + ' mm). Increase the stock length.'
      : '自動補料長度（' + lenText + ' 毫米）短於最長切割項目（' + cutText + ' 毫米），請增加補料長度。';
  }

  function syncQuickSettings() {
    var en = isEn(), light = document.body.classList.contains('sepia-mode') || document.body.classList.contains('light-mode');
    var title = byId('displayQuickSettingsTitle');
    if (title) title.textContent = en ? 'Display & theme' : '顯示與主題';
    var theme = byId('settingsThemeDirect');
    if (theme) {
      theme.textContent = en ? 'Theme: ' + (light ? 'Light' : 'Dark') + ' (switch)' : '主題：' + (light ? '光明' : '深色') + '（切換）';
      theme.setAttribute('aria-label', theme.textContent);
    }
    var tune = byId('settingsTuneDirect');
    if (tune) tune.textContent = en ? 'Display tuning' : '進階顯示設定';
    var increase = byId('settingsFontIncreaseDirect'), decrease = byId('settingsFontDecreaseDirect');
    if (increase) increase.setAttribute('aria-label', en ? 'Increase font size' : '放大字體');
    if (decrease) decrease.setAttribute('aria-label', en ? 'Decrease font size' : '縮小字體');
    var examples = byId('helpExamplesButton');
    if (examples) examples.textContent = en ? 'View examples' : '查看使用案例';
    var helpClose = byId('helpCloseBtn');
    if (helpClose) helpClose.textContent = en ? 'Close' : '關閉';
    updateUnitTriggers();
    updateAutoReplenishState();
    updateAutoReplenishWarning();
  }

  var modal = byId('unitPickerModal');
  if (modal) modal.addEventListener('show.bs.modal', function (event) {
    var opener = event.relatedTarget;
    updateUnitDialog(opener && opener.getAttribute('data-target-select'));
  });
  ['unit', 'globalCutUnit', 'globalMaterialUnit'].forEach(function (id) {
    var select = byId(id);
    if (select) {
      select.addEventListener('change', updateUnitTriggers);
      select.addEventListener('input', updateUnitTriggers);
    }
  });

  var increaseButton = byId('settingsFontIncreaseDirect');
  if (increaseButton) increaseButton.addEventListener('click', function () { var action = byId('settingsFontIncrease'); if (action) action.click(); });
  var decreaseButton = byId('settingsFontDecreaseDirect');
  if (decreaseButton) decreaseButton.addEventListener('click', function () { var action = byId('settingsFontDecrease'); if (action) action.click(); });
  var themeButton = byId('settingsThemeDirect');
  if (themeButton) themeButton.addEventListener('click', function () { var action = byId('themeToggleBtn'); if (action) action.click(); syncQuickSettings(); });
  var tuneButton = byId('settingsTuneDirect');
  if (tuneButton) tuneButton.addEventListener('click', function () {
    if (typeof window.__openDisplayTune === 'function') window.__openDisplayTune();
    else if (byId('displayTuneBtn')) byId('displayTuneBtn').click();
    if (typeof window.__syncReferenceSettingsPanel === 'function') window.__syncReferenceSettingsPanel();
  });

  var helpExamples = byId('helpExamplesButton');
  if (helpExamples) helpExamples.addEventListener('click', function (event) {
    event.preventDefault();
    var instance = window.bootstrap && window.bootstrap.Modal && window.bootstrap.Modal.getInstance(byId('helpModal'));
    if (instance) instance.hide();
    setTimeout(function () { if (typeof window.showCaseHelp === 'function') window.showCaseHelp(); }, instance ? 180 : 0);
  });

  var autoUi = window.updateAutoReplenishUI;
  if (typeof autoUi === 'function' && !autoUi.__uiReviewWrapped) {
    var wrappedAutoUi = function () { autoUi.apply(this, arguments); updateAutoReplenishState(); updateAutoReplenishWarning(); };
    wrappedAutoUi.__uiReviewWrapped = true;
    window.updateAutoReplenishUI = wrappedAutoUi;
  }
  var autoWarning = window.updateAutoReplenishWarning;
  if (typeof autoWarning === 'function' && !autoWarning.__uiReviewWrapped) {
    var wrappedWarning = function () { autoWarning.apply(this, arguments); updateAutoReplenishWarning(); };
    wrappedWarning.__uiReviewWrapped = true;
    window.updateAutoReplenishWarning = wrappedWarning;
  }
  var updateLanguage = window.updateLanguage;
  if (typeof updateLanguage === 'function' && !updateLanguage.__uiReviewWrapped) {
    var wrappedLanguage = function () { var result = updateLanguage.apply(this, arguments); syncQuickSettings(); return result; };
    wrappedLanguage.__uiReviewWrapped = true;
    window.updateLanguage = wrappedLanguage;
  }
  if (window.matchMedia) {
    window.addEventListener('resize', function () {
      if (window.__stage1HeaderToolsDrawer && window.matchMedia('(min-width: 768px)').matches && typeof window.__restoreStage1HeaderTools === 'function') window.__restoreStage1HeaderTools();
      if (window.matchMedia('(max-width: 767.98px)').matches) setTimeout(function () {
        if (window.matchMedia('(max-width: 767.98px)').matches && typeof window.__initStage1HeaderTools === 'function') window.__initStage1HeaderTools();
      }, 0);
    });
  }
  var language = byId('language');
  if (language) language.addEventListener('change', syncQuickSettings);
  if (document.body) new MutationObserver(syncQuickSettings).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncQuickSettings, { once: true });
  else syncQuickSettings();
})();
