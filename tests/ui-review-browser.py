"""Run with python3 tests/ui-review-browser.py [base URL]. Uses a fresh browser context."""
import sys
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8765/'
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    for width in [1440, 390, 391]:
        context = browser.new_context(viewport={'width': width, 'height': 900}, service_workers='block', **({'user_agent':'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36'} if width == 391 else {}))
        page = context.new_page()
        page.set_default_timeout(8000)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('dialog', lambda dialog: dialog.accept())
        page.goto(URL, wait_until='networkidle')
        page.wait_for_timeout(500)
        page.select_option('#language', 'zh', force=True)
        page.evaluate('window.updateLanguage()')
        assert '毫米' in page.locator('#autoReplenishState').inner_text()
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
        if width < 768:
            page.locator('#stage1HeaderToolsButton').click()
            assert page.locator('#stage1ToolsDrawer #languageToggle').is_visible()
            assert page.locator('#stage1ToolsDrawer #btnToTop').is_visible()
            page.locator('.stage1-tools-close').click()
        page.locator('#unitPickerBtn').click()
        page.wait_for_timeout(400)
        page.locator('#unitPickerModal.show').wait_for()
        assert page.locator('#unitPickerModalLabel').inner_text() == '結果顯示單位'
        assert '公制' in page.locator('#unitPickerModal [data-unit-value="metric"]').inner_text()
        page.locator('#unitPickDecimal').click()
        page.wait_for_timeout(400)
        assert page.locator('#unit').input_value() == 'imperial_decimal'
        assert page.locator('#globalCutUnit').input_value() == 'metric'
        page.locator('#unitPickerBtn').click()
        page.wait_for_timeout(400)
        page.locator('#unitPickerModal [data-unit-value="metric"]').click()
        page.wait_for_timeout(400)
        # Actual input/add flow, not synthetic rows.
        page.locator('#cuttingItems .cutLengthPart').nth(0).fill('4')
        page.locator('#cuttingItems .cutQty').fill('1')
        page.locator('#addCuttingButton').click()
        page.locator('#autoReplenishPickerBtn').click()
        page.wait_for_timeout(400)
        page.locator('#autoReplenishModal [data-ar-len="3000"]').click()
        page.wait_for_timeout(400)
        assert '3,000' in page.locator('#autoReplenishState').inner_text()
        assert page.locator('#autoReplenishWarning').is_visible()
        page.locator('#autoReplenishPickerBtn').click()
        page.wait_for_timeout(400)
        page.locator('#autoReplenishModal [data-ar-len="0"]').click()
        page.wait_for_timeout(400)
        assert '已關閉' in page.locator('#autoReplenishState').inner_text()
        assert not page.locator('#autoReplenishWarning').is_visible()
        assert page.evaluate('window.getAutoReplenishLength()') == 3000
        page.locator('#autoReplenishPickerBtn').click()
        page.wait_for_timeout(400)
        page.locator('#autoReplenishModal [data-ar-len="6000"]').click()
        page.wait_for_timeout(400)
        before = page.evaluate('document.documentElement.style.fontSize')
        page.locator('#settingsFontIncreaseDirect').click()
        assert page.evaluate('document.documentElement.style.fontSize') != before
        page.locator('#settingsFontDecreaseDirect').click()
        page.locator('#settingsTuneDirect').click()
        assert page.locator('#displayTuneModal').get_attribute('aria-hidden') == 'false'
        page.locator('#tuneClose').click()
        if width < 768:
            page.locator('#stage1HeaderToolsButton').click()
        page.locator('#newHelpBtn').click()
        page.locator('#helpModal.show').wait_for()
        page.wait_for_timeout(400)
        page.locator('#helpExamplesButton').click()
        page.wait_for_timeout(500)
        assert page.locator('#ag-case-help-overlay').is_visible()
        page.locator('#ag-case-help-close').click()
        # Exercise real renderer with known geometry; optimizers themselves are unchanged.
        page.evaluate('renderCuttingResults([{length:6000,cuts:[{length:1000},{length:2000}]}],3.2)')
        assert page.locator('.cut-segment').count() == 2
        assert page.locator('.cut-order').evaluate('(e)=>getComputedStyle(e).fontSize') == '14px'
        geometry = page.locator('.cut-segment').evaluate_all('(es)=>es.map(e=>e.style.width)')
        for mode in ['flat','metal','soft','standard']:
            page.locator('[data-gradient-mode="'+mode+'"]').click()
            assert page.locator('[data-gradient-mode="'+mode+'"]').get_attribute('aria-pressed') == 'true'
            assert geometry == page.locator('.cut-segment').evaluate_all('(es)=>es.map(e=>e.style.width)')
        page.reload(wait_until='networkidle')
        assert page.locator('#unit').input_value() == 'metric'
        assert '6,000' in page.locator('#autoReplenishState').inner_text()
        if width < 768:
            page.set_viewport_size({'width':1440,'height':900})
            page.wait_for_timeout(500)
            assert page.locator('.top-tools').count() == 1
            assert page.locator('#stage1ToolsDrawer').count() == 0
            page.set_viewport_size({'width':390,'height':900})
            page.wait_for_timeout(500)
            page.locator('#stage1HeaderToolsButton').click()
            assert page.locator('#stage1ToolsDrawer #languageToggle').is_visible()
        assert not errors, errors
        print(f'PASS {width}px: units, replenish, persistence, font/display, help/examples, chart modes/geometry, responsive tools; no JS errors', flush=True)
        context.close()
    browser.close()
