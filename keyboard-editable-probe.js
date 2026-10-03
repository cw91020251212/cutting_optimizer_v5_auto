/* Optional full-app keyboard test. The default app never replaces its inputs.
 * Try only with ?keyboard_mode=editable; no data is saved by this module. */
(function () {
  if (new URLSearchParams(location.search).get('keyboard_mode') !== 'editable') return;

  const sources = document.querySelectorAll(
    '#cuttingItems .cutLengthPart, #cuttingItems .cutQty, ' +
    '#materialItems .materialLengthPart, #materialItems .materialQty, ' +
    '#sawThickness, #cuttingItems .cutPurpose'
  );
  const style = document.createElement('style');
  style.id = 'editable-numeric-probe-style';
  style.textContent = `
    /* Android Chrome moves layout-viewport fixed controls above the IME.
       They are useful when browsing, but obstruct the keyboard while typing. */
    body.ag-editable-keyboard-open #ag-info-bar,
    body.ag-editable-keyboard-open .scroll-nav {
      visibility: hidden !important;
      pointer-events: none !important;
    }
    .ag-numeric-editor {
      white-space: nowrap;
      overflow-x: auto;
      overflow-y: hidden;
      scrollbar-width: none;
    }
    .ag-numeric-editor::-webkit-scrollbar { display: none; }
    .ag-numeric-editor:empty::before {
      content: attr(data-placeholder);
      color: #697985;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);

  sources.forEach(function (source) {
    const editor = document.createElement('div');
    editor.className = source.className + ' ag-numeric-editor';
    editor.setAttribute('contenteditable', 'plaintext-only');
    editor.setAttribute('inputmode', source.inputMode || 'text');
    editor.setAttribute('role', 'textbox');
    editor.setAttribute('aria-multiline', 'false');
    editor.setAttribute('tabindex', '0');
    if (source.id) editor.id = source.id;
    if (source.dataset.part) editor.dataset.part = source.dataset.part;
    if (source.placeholder) editor.dataset.placeholder = source.placeholder;
    const isSawThickness = source.id === 'sawThickness';
    const isPurpose = source.classList.contains('cutPurpose');
    const isMaterial = !!source.closest('#materialItems');
    const isQuantity = source.classList.contains('cutQty') || source.classList.contains('materialQty');
    editor.setAttribute('aria-label',
      isSawThickness ? '鋸片厚度' : (isPurpose ? '用途' :
        (isMaterial ? '材料' : '切割') + (isQuantity ? '數量' : '長度')));

    // Existing calculation, edit, reset and unit-conversion code reads/writes
    // .value on the eight controls. Preserve that interface on the div.
    Object.defineProperty(editor, 'value', {
      configurable: true,
      get: function () { return this.textContent || ''; },
      set: function (value) {
        const next = value == null ? '' : String(value);
        if (this.textContent !== next) this.textContent = next;
      }
    });
    editor.value = source.value;
    source.replaceWith(editor);

    editor.addEventListener('beforeinput', function (event) {
      if (event.inputType === 'insertParagraph' || event.inputType === 'insertLineBreak') {
        event.preventDefault();
      }
    });
    editor.addEventListener('input', function () {
      if (!/[\r\n]/.test(editor.value)) return;
      editor.value = editor.value.replace(/[\r\n]+/g, '');
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    });
  });

  function syncKeyboardChrome() {
    const focused = document.activeElement && document.activeElement.classList &&
      document.activeElement.classList.contains('ag-numeric-editor');
    document.body.classList.toggle('ag-editable-keyboard-open', !!focused);
  }
  document.addEventListener('focusin', syncKeyboardChrome);
  document.addEventListener('focusout', function () {
    setTimeout(syncKeyboardChrome, 80);
  });
  syncKeyboardChrome();

  window.__editableNumericProbe = { active: true, fields: sources.length };
})();
