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
  let alignmentInterval = null;
  const normalVisualHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
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
  function alignFocusedEditor(allowPreFocus) {
    if (!focusedEditor || !document.body.contains(focusedEditor) ||
        (!allowPreFocus && document.activeElement !== focusedEditor)) return;
    const card = focusedEditor.closest('#settings-card, #cutting-items-card, #materials-card, #results-card');
    const anchor = (card && card.querySelector('.section-header')) || focusedEditor;
    const rect = anchor.getBoundingClientRect();
    const viewportTop = window.visualViewport ? window.visualViewport.offsetTop : 0;
    // Use the browser-provided safe-area size instead of guessing a fixed
    // status-bar height. Android Chrome normally already excludes its status
    // bar from the page viewport; on notched devices env() may add the inset.
    const topClearance = Math.max(8, viewportTop + 8, readSafeTopInset() + 8);
    const targetY = Math.max(0, (window.pageYOffset || 0) + rect.top - viewportTop - topClearance);
    window.scrollTo({ top: targetY, behavior: 'auto' });
  }
  let safeTopInset = null;
  function readSafeTopInset() {
    if (safeTopInset !== null) return safeTopInset;
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;padding-top:env(safe-area-inset-top, 0px);pointer-events:none;visibility:hidden;';
    document.body.appendChild(probe);
    safeTopInset = parseFloat(getComputedStyle(probe).paddingTop) || 0;
    probe.remove();
    return safeTopInset;
  }
  function scheduleEditorAlignment(editor) {
    focusedEditor = editor;
    setKeyboardScrollSpace(true);
    scrollTimers.forEach(clearTimeout);
    if (alignmentInterval) clearInterval(alignmentInterval);
    // Android can temporarily lock scroll while the IME animates in. Keep
    // correcting briefly after focus instead of stopping at the first lock.
    alignmentInterval = setInterval(alignFocusedEditor, 90);
    scrollTimers = [0, 120, 280, 520, 900, 1400, 1900].map(function (delay) {
      return setTimeout(alignFocusedEditor, delay);
    });
    scrollTimers.push(setTimeout(function () {
      if (alignmentInterval) {
        clearInterval(alignmentInterval);
        alignmentInterval = null;
      }
    }, 2300));
  }
  function stopEditorAlignment() {
    scrollTimers.forEach(clearTimeout);
    scrollTimers = [];
    if (alignmentInterval) {
      clearInterval(alignmentInterval);
      alignmentInterval = null;
    }
    focusedEditor = null;
    setKeyboardScrollSpace(false);
    document.body.classList.remove('ag-editable-keyboard-open');
  }
  function focusAfterPreScroll(event) {
    const editor = event.currentTarget;
    if (!editor || document.activeElement === editor || editor.__preScrollFocus) return;
    // The IME opens after this handler. Scroll synchronously first, then focus
    // in the same user gesture so Android cannot freeze the page mid-scroll.
    editor.__preScrollFocus = true;
    event.preventDefault();
    focusedEditor = editor;
    setKeyboardScrollSpace(true);
    alignFocusedEditor(true);
    editor.focus({ preventScroll: true });
    setTimeout(function () { editor.__preScrollFocus = false; }, 0);
  }
  let touchCandidate = null;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchMoved = false;
  document.addEventListener('touchstart', function (event) {
    const editor = event.target && event.target.closest ? event.target.closest('.ag-numeric-editor') : null;
    if (!editor || !event.touches || !event.touches[0]) return;
    touchCandidate = editor;
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
    touchMoved = false;
  }, { capture: true, passive: true });
  document.addEventListener('touchmove', function (event) {
    if (!touchCandidate || !event.touches || !event.touches[0]) return;
    const dx = event.touches[0].clientX - touchStartX;
    const dy = event.touches[0].clientY - touchStartY;
    if (Math.hypot(dx, dy) > 8) {
      touchMoved = true;
      touchCandidate = null;
    }
  }, { capture: true, passive: true });
  document.addEventListener('touchend', function (event) {
    const editor = touchCandidate;
    touchCandidate = null;
    if (!editor || touchMoved) return;
    // Wait until touchend confirms this was a tap, not the start of a swipe.
    // This removes the eager focus/keyboard reaction on a scrolling gesture.
    focusAfterPreScroll({
      currentTarget: editor,
      preventDefault: function () { event.preventDefault(); }
    });
  }, { capture: true, passive: false });
  document.addEventListener('touchcancel', function () {
    touchCandidate = null;
    touchMoved = false;
  }, { capture: true, passive: true });
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
        stopEditorAlignment();
      }
    }, 80);
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      // When the IME closes, the visual viewport returns to its normal height.
      // Stop before the user's next swipe so no timer competes with scrolling.
      if (focusedEditor && window.visualViewport.height >= normalVisualHeight - 40) {
        stopEditorAlignment();
        return;
      }
      if (focusedEditor) scheduleEditorAlignment(focusedEditor);
    }, { passive: true });
  }
  syncKeyboardChrome();

  window.__editableNumericProbe = { active: true, fields: sources.length };
})();
