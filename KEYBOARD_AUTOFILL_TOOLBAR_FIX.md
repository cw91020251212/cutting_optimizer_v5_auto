# Android Chrome 鍵盤上方「鑰匙／信用卡／定位」三個圖示修正方法

## 1. 問題現象

在 Android Chrome 網頁輸入欄聚焦時，鍵盤上方可能出現三個工具圖示，常見包括：

- 鑰匙：密碼／登入資料自動填寫
- 信用卡：付款資料自動填寫
- 定位圖示：地址／位置資料自動填寫

這三個圖示通常**不是輸入法本身加入的按鈕**，而是 Chrome／Android 的 Autofill（自動填寫）輔助工具列。某些普通數字欄或文字欄被 Chrome 誤判為可自動填寫欄位時，也可能出現這組工具列。

## 2. 為甚麼只加 `autocomplete="off"` 未必有效

以下寫法可以提供提示，但不能保證 Android Chrome 完全不顯示工具列：

```html
<input
  type="text"
  inputmode="numeric"
  autocomplete="off">
```

原因是：

1. `autocomplete="off"` 是瀏覽器提示，不是強制關閉所有瀏覽器／密碼管理器 UI。
2. Autofill 工具列可能根據欄位型態、頁面表單結構、歷史資料或瀏覽器版本自行判斷。
3. `inputmode="numeric"` 只表示「希望顯示數字鍵盤」，並不會禁止 Chrome 顯示 Autofill 工具列。
4. 網站沒有 API 可以直接命令 Android Chrome 永久關閉這條原生工具列。

## 3. 本次採用的核心方法

將會觸發問題的普通 `<input>` 替換為：

```html
<div
  contenteditable="plaintext-only"
  inputmode="numeric"
  role="textbox"
  aria-multiline="false"
  tabindex="0">
</div>
```

重點是：

- `contenteditable="plaintext-only"`：保留可輸入功能，但不再是原生表單 `<input>`。
- `inputmode="numeric"` 或 `inputmode="decimal"`：仍然要求 Android 顯示數字／小數鍵盤。
- `inputmode="text"`：給用途、備註等普通文字欄使用。
- `role="textbox"`、`aria-label`、`aria-multiline="false"`：維持輔助工具可理解性。
- 禁止換行，避免單行數值欄變成多行編輯區。

## 4. 最重要的相容性處理：保留 `.value` 介面

現有程式通常會這樣讀取欄位：

```js
const value = document.querySelector('.quantity').value;
```

但 `div[contenteditable]` 原本沒有 `.value`。如果只替換 HTML 而不處理這點，計算、驗證、編輯及清空功能會失效。

可在建立可編輯元素時加入兼容屬性：

```js
Object.defineProperty(editor, 'value', {
  configurable: true,
  get() {
    return this.textContent || '';
  },
  set(value) {
    const next = value == null ? '' : String(value);
    if (this.textContent !== next) {
      this.textContent = next;
    }
  }
});
```

之後原本的程式仍可使用：

```js
editor.value = '12';
const quantity = Number(editor.value);
```

## 5. 替換欄位的通用範例

```js
function replaceWithEditable(source, inputMode, label) {
  const editor = document.createElement('div');

  editor.className = source.className + ' editable-field';
  editor.id = source.id || '';
  editor.setAttribute('contenteditable', 'plaintext-only');
  editor.setAttribute('inputmode', inputMode);
  editor.setAttribute('role', 'textbox');
  editor.setAttribute('aria-multiline', 'false');
  editor.setAttribute('aria-label', label);
  editor.setAttribute('tabindex', '0');

  Object.defineProperty(editor, 'value', {
    configurable: true,
    get() {
      return this.textContent || '';
    },
    set(value) {
      this.textContent = value == null ? '' : String(value);
    }
  });

  editor.value = source.value;
  source.replaceWith(editor);

  // 禁止 Enter 造成換行
  editor.addEventListener('beforeinput', event => {
    if (event.inputType === 'insertParagraph' ||
        event.inputType === 'insertLineBreak') {
      event.preventDefault();
    }
  });

  // 保險清除貼上或輸入造成的換行
  editor.addEventListener('input', () => {
    if (/\r|\n/.test(editor.value)) {
      editor.value = editor.value.replace(/[\r\n]+/g, '');
    }
  });

  return editor;
}
```

## 6. 這個專案實際替換的欄位

本次不只替換數字欄，也替換了仍然會觸發三圖示的文字欄：

```js
const fields = document.querySelectorAll(
  '#cuttingItems .cutLengthPart, ' +
  '#cuttingItems .cutQty, ' +
  '#materialItems .materialLengthPart, ' +
  '#materialItems .materialQty, ' +
  '#sawThickness, ' +
  '#cuttingItems .cutPurpose'
);
```

對應的鍵盤模式：

| 欄位 | `inputmode` |
|---|---|
| 米／厘米／毫米等長度欄 | `decimal` |
| 數量欄 | `numeric` |
| 鋸片厚度 | `decimal` |
| 切割用途 | `text` |

## 7. 不要只處理初始 HTML

如果頁面可以新增或複製資料列，必須注意：

- 新增切割項目後的欄位是否仍然使用同一種輸入元件
- 編輯舊項目時，程式是否仍然讀到 `.value`
- 清空欄位、載入方案、單位轉換是否仍然可以設定 `.value`
- 所有驗證、計算、`input`／`change` 事件是否仍然有效

推薦做法是：

1. 在所有動態資料列建立完成後替換欄位；或
2. 建立資料列時直接使用同一個 `createEditableField()` 工具函式。

## 8. Android 鍵盤彈出時的畫面定位

`contenteditable` 會令 Android Chrome 以另一種方式處理鍵盤和可視視窗。若欄位在頁面較低位置，建議：

1. 先找出欄位所屬的卡片標題列。
2. 聚焦時將**卡片標題列**放到安全頂距，而不是將輸入欄硬推到頁面 `0px`。
3. 讀取瀏覽器實際提供的安全區，不要自行固定使用過大的 64px。

基本定位概念：

```js
const card = editor.closest(
  '#settings-card, #cutting-items-card, #materials-card'
);
const anchor = card?.querySelector('.section-header') || editor;
const rect = anchor.getBoundingClientRect();
const viewportTop = window.visualViewport?.offsetTop || 0;
const safeTop = readSafeAreaTop();
const topClearance = Math.max(8, viewportTop + 8, safeTop + 8);

window.scrollTo({
  top: Math.max(0, window.pageYOffset + rect.top - viewportTop - topClearance),
  behavior: 'auto'
});
```

讀取 safe-area 的方式：

```js
function readSafeAreaTop() {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;left:0;top:0;width:0;height:0;' +
    'padding-top:env(safe-area-inset-top, 0px);' +
    'visibility:hidden;pointer-events:none;';

  document.body.appendChild(probe);
  const value = parseFloat(getComputedStyle(probe).paddingTop) || 0;
  probe.remove();
  return value;
}
```

## 9. 避免鍵盤鎖住頁面捲動

Android 鍵盤彈出期間可能暫時鎖住頁面捲動。實作上可採用：

- 觸控手勢確認是輕點後，先定位，再聚焦開鍵盤
- 鍵盤動畫期間短時間重試定位
- 鍵盤收起或欄位失焦時，立即停止所有計時器及 `setInterval`

### 觸控手勢判斷

不要在 `touchstart` 一發生就開鍵盤，否則使用者開始撥動畫面時會誤觸輸入欄。

```js
let candidate = null;
let startX = 0;
let startY = 0;
let moved = false;

// touchstart：只記錄候選欄位
// touchmove：移動超過約 8px 就視為撥動，取消候選
// touchend：沒有明顯移動才視為輕點，才開啟輸入欄
```

實際門檻應按裝置測試；本次使用約 **8px**。

### 清理計時器

```js
function stopEditorAlignment() {
  timers.forEach(clearTimeout);
  timers = [];

  if (alignmentInterval) {
    clearInterval(alignmentInterval);
    alignmentInterval = null;
  }

  focusedEditor = null;
  restoreNormalBodyPadding();
  document.body.classList.remove('keyboard-open');
}
```

如果沒有這個清理步驟，鍵盤收起後使用者撥動頁面時，程式的自動捲動會和手指爭奪控制權，造成頁面短時間上上落落、不順暢。

## 10. 需要知道的限制

這個方法是實務上的 workaround，不是瀏覽器標準的「關閉 Chrome 工具列 API」：

- 不保證所有 Android 瀏覽器版本都完全相同。
- 不應該假設 `autocomplete="off"` 可以完全控制密碼管理器。
- `contenteditable` 需要自行處理 `.value`、輸入驗證、游標、貼上及換行。
- 輸入欄若需要原生表單提交、瀏覽器原生驗證或 `form.elements`，應額外做同步或保留隱藏原生欄位。
- 最好在真實 Android Chrome 裝置測試，不要只依賴桌面瀏覽器。
- 必須測試「輕點」、「撥動」、「鍵盤彈出」、「鍵盤收起」、「新增資料列」、「編輯資料列」及「計算」整套流程。

## 11. 建議交付給其他開發者的簡短結論

> Android Chrome 鍵盤上方的鑰匙、信用卡及定位圖示，主要是 Chrome Autofill 工具列，不是輸入法錯誤。單靠 `autocomplete="off"` 不一定能關閉。對不需要瀏覽器原生 Autofill 的欄位，可改用 `contenteditable="plaintext-only"`，並指定 `inputmode="numeric"`、`decimal` 或 `text` 以保留正確鍵盤。若現有程式依賴 `.value`，必須用 getter／setter 將 `textContent` 映射回 `.value`。另外，Android 鍵盤彈出及收起時要處理視窗定位和清理計時器，否則會出現欄位被遮住或頁面自動上落的問題。

## 12. 本次專案版本記錄

- Git commit：`ee10ec9`
- GitHub Pages：`built`
- 目前正式測試網址：<https://cw91020251212.github.io/cutting_optimizer_v5_auto/?v=ee10ec9>
- 回退原生輸入方式：在網址加入 `?keyboard_mode=legacy`
