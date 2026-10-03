/* Optional full-app keyboard test. The default app never replaces its inputs.
 * Try only with ?keyboard_mode=editable; no data is saved by this module. */
(function () {
  if (new URLSearchParams(location.search).get('keyboard_mode') !== 'editable') return;

  const sources = document.querySelectorAll(
    '#cuttingItems .cutLengthPart, #cuttingItems .cutQty, ' +
    '#materialItems .materialLengthPart, #materialItems .materialQty'
  );
  const style = document.createElement('style');
  style.id = 'editable-numeric-probe-style';
  style.textContent = `
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
    editor.setAttribute('inputmode', source.inputMode);
    editor.setAttribute('role', 'textbox');
    editor.setAttribute('aria-multiline', 'false');
    editor.setAttribute('tabindex', '0');
    if (source.dataset.part) editor.dataset.part = source.dataset.part;
    if (source.placeholder) editor.dataset.placeholder = source.placeholder;
    const isMaterial = !!source.closest('#materialItems');
    const isQuantity = source.classList.contains('cutQty') || source.classList.contains('materialQty');
    editor.setAttribute('aria-label',
      (isMaterial ? '材料' : '切割') + (isQuantity ? '數量' : '長度'));

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

  window.__editableNumericProbe = { active: true, fields: sources.length };
})();
