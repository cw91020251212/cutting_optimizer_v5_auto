/* Full-app keyboard fix: use contenteditable fields by default so Android
 * Chrome does not show its autofill accessory icons. Add
 * ?keyboard_mode=legacy to temporarily restore the native text inputs. */
(function () {
  const keyboardMode = new URLSearchParams(location.search).get('keyboard_mode');
  if (keyboardMode === 'legacy') return;

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
    // .value on these controls. Preserve that interface on the div.
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

  let focusedEditor = null;
  let scrollTimers = [];
  let originalBodyPaddingBottom = null;
  function setKeyboardScrollSpace(active) {
    if (active) {
      if (originalBodyPaddingBottom === null) {
        originalBodyPaddingBottom = document.body.style.paddingBottom;
      }
      const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      document.body.style.setProperty('padding-bottom', `${Math.max(480, Math.round(viewportHeight * 0.9))}px`, 'important');
    } else if (originalBodyPaddingBottom !== null) {
      if (originalBodyPaddingBottom) {
        document.body.style.setProperty('padding-bottom', originalBodyPaddingBottom);
      } else {
        document.body.style.removeProperty('padding-bottom');
      }
      originalBodyPaddingBottom = null;
    }
  }
  function alignFocusedEditor() {
    if (!focusedEditor || !document.body.contains(focusedEditor) ||
        document.activeElement !== focusedEditor) return;
    const card = focusedEditor.closest('#settings-card, #cutting-items-card, #materials-card, #results-card');
    const anchor = (card && card.querySelector('.section-header')) || focusedEditor;
    const rect = anchor.getBoundingClientRect();
    const viewportTop = window.visualViewport ? window.visualViewport.offsetTop : 0;
    // Android's status/browser area is outside the page viewport and can cover
    // a header placed at y=0. Keep the 1/4, 2/4, 3/4 labels below that area.
    const topClearance = 64;
    const targetY = Math.max(0, (window.pageYOffset || 0) + rect.top - viewportTop - topClearance);
    window.scrollTo({ top: targetY, behavior: 'auto' });
  }
  function scheduleEditorAlignment(editor) {
    focusedEditor = editor;
    setKeyboardScrollSpace(true);
    scrollTimers.forEach(clearTimeout);
    scrollTimers = [0, 100, 260, 520, 850].map(function (delay) {
      return setTimeout(alignFocusedEditor, delay);
    });
  }
  document.addEventListener('focusin', syncKeyboardChrome);
  document.addEventListener('focusin', function (event) {
    if (event.target && event.target.classList &&
        event.target.classList.contains('ag-numeric-editor')) {
      scheduleEditorAlignment(event.target);
    }
  });
  document.addEventListener('focusout', function () {
    setTimeout(function () {
      syncKeyboardChrome();
      if (!document.activeElement || !document.activeElement.classList ||
          !document.activeElement.classList.contains('ag-numeric-editor')) {
        focusedEditor = null;
        setKeyboardScrollSpace(false);
        scrollTimers.forEach(clearTimeout);
        scrollTimers = [];
      }
    }, 80);
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      if (focusedEditor) scheduleEditorAlignment(focusedEditor);
    }, { passive: true });
  }
  syncKeyboardChrome();

  window.__editableNumericProbe = { active: true, fields: sources.length };
})();
