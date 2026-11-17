/* Local review: rearrange existing nodes, never clone controls or change app data. */
(function () {
  'use strict';
  if (!window.matchMedia) return;
  var desktopQuery = window.matchMedia('(min-width: 768px)');
  var phoneDevice = Boolean(navigator.userAgentData && navigator.userAgentData.mobile) ||
    /iPhone|iPod|Android[^\n]*Mobile/i.test(navigator.userAgent);
  var active = false, moved = [], operations, results, quickPanel, quickToggle, utilityRow, commandCard;
  var resultObserver, languageObserver;
  var originalScrollTo = window.__agScrollTo;

  function byId(id) { return document.getElementById(id); }
  function move(node, parent) {
    if (!node) return;
    var marker = document.createComment('desktop-review-original-position');
    node.parentNode.insertBefore(marker, node);
    moved.push({ node: node, marker: marker });
    parent.appendChild(node);
  }
  function english() { return byId('language') && byId('language').value === 'en'; }
  function syncLabels() {
    if (!active) return;
    quickToggle.querySelector('span').textContent = english() ? 'Tools' : '工具';
    quickToggle.setAttribute('aria-label', english() ? 'Quick tools' : '快捷工具');
    quickPanel.setAttribute('aria-label', english() ? 'Quick tools' : '快捷工具');
    operations.setAttribute('aria-label', english() ? 'Operations' : '操作區');
    results.setAttribute('aria-label', english() ? 'Cutting results' : '切割結果');
  }
  function positionQuickPanel() {
    if (!active || quickPanel.hidden) return;
    var rect = quickToggle.getBoundingClientRect();
    quickPanel.style.left = Math.max(12, rect.right - 300) + 'px';
    quickPanel.style.top = Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - quickPanel.offsetHeight - 16)) + 'px';
  }
  function setQuickOpen(open, returnFocus) {
    if (!quickPanel) return;
    quickPanel.hidden = !open;
    quickToggle.setAttribute('aria-expanded', String(open));
    if (open) positionQuickPanel();
    if (!open && returnFocus) quickToggle.focus({ preventScroll: true });
  }
  function syncResults() {
    if (!active) return;
    // A visible result or scheme is evidence; calculate/reset/progress alone are not results.
    var hasResults = ['resultDetails', 'cuttingCanvas', 'colorLegend', 'schemeSelector'].some(function (id) {
      var el = byId(id);
      return el && !el.hidden && el.style.display !== 'none' &&
        (id === 'cuttingCanvas' || el.children.length > 0 || el.textContent.trim().length > 0);
    });
    results.classList.toggle('has-results', hasResults);
    if (!hasResults) results.scrollTop = 0;
  }
  function scrollPaneTo(pane, element) {
    if (!pane || !element) return;
    var paneRect = pane.getBoundingClientRect(), rect = element.getBoundingClientRect();
    pane.scrollTo({ top: Math.max(0, pane.scrollTop + rect.top - paneRect.top - 10), behavior: 'smooth' });
  }
  // Preserve the legacy helper verbatim for mobile. Desktop scrolls only the owning pane.
  window.__agScrollTo = function (element) {
    if (!active) return originalScrollTo && originalScrollTo.apply(this, arguments);
    syncResults();
    if (element && results.contains(element)) {
      requestAnimationFrame(function () { if (active) scrollPaneTo(results, element); });
    } else if (element && operations.contains(element)) {
      scrollPaneTo(operations, element);
    } else if (originalScrollTo) {
      return originalScrollTo.apply(this, arguments);
    }
  };
  function enterDesktop() {
    if (active) return;
    var container = document.querySelector('#contentRoot > .container-fluid');
    var resultCard = byId('results-card');
    if (!container || !resultCard) return;
    active = true;
    operations = document.createElement('section'); operations.id = 'desktopOperations'; operations.tabIndex = 0;
    results = document.createElement('section'); results.id = 'desktopResults'; results.tabIndex = 0;
    utilityRow = document.createElement('div'); utilityRow.className = 'desktop-utility-row';
    quickToggle = document.createElement('button');
    quickToggle.id = 'desktopQuickToggle'; quickToggle.type = 'button';
    quickToggle.setAttribute('aria-controls', 'desktopQuickActions');
    quickToggle.setAttribute('aria-expanded', 'false');
    quickToggle.innerHTML = '<i class="fa-solid fa-ellipsis" aria-hidden="true"></i><span></span>';
    utilityRow.appendChild(quickToggle);
    quickPanel = document.createElement('section'); quickPanel.id = 'desktopQuickActions'; quickPanel.hidden = true;
    document.body.appendChild(quickPanel);
    var extra = document.createElement('div'); extra.className = 'desktop-quick-extra';
    move(document.querySelector('.top-tools'), quickPanel);
    quickPanel.appendChild(extra);
    move(byId('languageToggle'), extra);
    move(document.querySelector('.scroll-nav'), extra);
    move(byId('pageTitle'), operations);
    operations.appendChild(utilityRow);
    move(byId('settings-card'), operations);
    move(document.querySelector('.ag-main-cards-row'), operations);
    commandCard = document.createElement('div'); commandCard.id = 'desktopCommandCard'; commandCard.className = 'card';
    var commandBody = document.createElement('div'); commandBody.className = 'card-body text-center';
    commandCard.appendChild(commandBody);
    move(resultCard.querySelector('.button-group'), commandBody);
    move(byId('progressBar'), commandBody);
    operations.appendChild(commandCard);
    move(resultCard, results);
    container.appendChild(operations); container.appendChild(results);
    document.documentElement.classList.add('desktop-workspace');
    quickToggle.addEventListener('click', function () { setQuickOpen(quickPanel.hidden); });
    quickPanel.addEventListener('click', function (event) {
      if (event.target.closest('button')) setQuickOpen(false, true);
    });
    operations.addEventListener('scroll', positionQuickPanel, { passive: true });
    resultObserver = new MutationObserver(syncResults);
    resultObserver.observe(resultCard, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'hidden'] });
    languageObserver = new MutationObserver(syncLabels);
    languageObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    syncLabels(); syncResults();
    // Do not carry window scroll from the old single-column layout into this viewport.
    window.scrollTo(0, 0);
  }
  function leaveDesktop() {
    if (!active) return;
    setQuickOpen(false);
    resultObserver.disconnect(); languageObserver.disconnect();
    active = false;
    moved.forEach(function (entry) { entry.marker.replaceWith(entry.node); });
    moved = [];
    operations.remove(); results.remove(); quickPanel.remove();
    document.documentElement.classList.remove('desktop-workspace');
    // The original mobile initializer used to run only at first load. Reuse it after resizing.
    if (typeof window.__initStage1HeaderTools === 'function') window.__initStage1HeaderTools();
    if (typeof window.__applyWoodOuterButtonSkin === 'function') window.__applyWoodOuterButtonSkin();
  }
  function syncViewport() { if (desktopQuery.matches && !phoneDevice) enterDesktop(); else leaveDesktop(); }
  document.addEventListener('click', function (event) {
    if (active && !quickPanel.hidden && !quickPanel.contains(event.target) && !quickToggle.contains(event.target)) setQuickOpen(false);
  });
  document.addEventListener('keydown', function (event) {
    if (active && event.key === 'Escape' && !quickPanel.hidden) setQuickOpen(false, true);
  });
  // Keep the existing arrow elements/icons/listeners; intercept only while desktop panes exist.
  document.addEventListener('click', function (event) {
    if (!active) return;
    var arrow = event.target.closest('#btnToTop, #btnToBottom');
    if (!arrow) return;
    event.preventDefault(); event.stopImmediatePropagation();
    operations.scrollTo({ top: arrow.id === 'btnToTop' ? 0 : operations.scrollHeight, behavior: 'smooth' });
    setQuickOpen(false, true);
  }, true);
  window.addEventListener('resize', function () { if (active) setQuickOpen(false); });
  if (desktopQuery.addEventListener) desktopQuery.addEventListener('change', syncViewport);
  else desktopQuery.addListener(syncViewport);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncViewport, { once: true });
  else syncViewport();
})();
