import threading
import unittest
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
CARDS = ("settings-card", "cutting-items-card", "materials-card", "results-card")


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


class SectionCollapseBrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        handler = partial(QuietHandler, directory=str(ROOT))
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        cls.server_thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.server_thread.start()
        cls.url = f"http://127.0.0.1:{cls.server.server_port}/"
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(
            executable_path="/usr/bin/chromium",
            headless=True,
            args=["--no-sandbox"],
        )

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()
        cls.server_thread.join(timeout=2)

    def open_page(self, width):
        page = self.browser.new_page(viewport={"width": width, "height": 900})
        page.goto(self.url, wait_until="domcontentloaded")
        page.locator("[data-section-toggle]").first.wait_for()
        page.evaluate("() => document.fonts.ready")
        return page

    def visible_buttons(self, page):
        return [
            (card_id, page.locator(f"#{card_id} [data-section-toggle]"))
            for card_id in CARDS
            if page.locator(f"#{card_id} [data-section-toggle]").is_visible()
        ]

    def test_chevron_remains_compact_and_can_toggle_the_section(self):
        for width, expected_visible in ((1280, 3), (390, 4)):
            with self.subTest(viewport=width):
                page = self.open_page(width)
                buttons = self.visible_buttons(page)
                self.assertEqual(len(buttons), expected_visible)
                for card_id, button in buttons:
                    button.scroll_into_view_if_needed()
                    metrics = button.evaluate(
                        "button => { const r=button.getBoundingClientRect();"
                        "const i=button.querySelector('i').getBoundingClientRect();"
                        "const s=getComputedStyle(button);"
                        "return {x:r.x,y:r.y,width:r.width,height:r.height,iconX:i.x,iconY:i.y,"
                        "iconWidth:i.width,iconHeight:i.height,background:s.backgroundColor,"
                        "shadow:s.boxShadow,borderWidth:s.borderWidth}; }"
                    )
                    self.assertLessEqual(metrics["width"], 16, f"{card_id}: {metrics}")
                    self.assertLessEqual(metrics["height"], 16, f"{card_id}: {metrics}")
                    self.assertEqual(metrics["x"], metrics["iconX"], f"{card_id}: {metrics}")
                    self.assertAlmostEqual(metrics["iconY"], metrics["y"] - 1, places=1, msg=f"{card_id}: {metrics}")
                    self.assertEqual(metrics["width"], metrics["iconWidth"], f"{card_id}: {metrics}")
                    self.assertEqual(metrics["height"], metrics["iconHeight"], f"{card_id}: {metrics}")
                    self.assertEqual(metrics["background"], "rgba(0, 0, 0, 0)")
                    self.assertEqual(metrics["shadow"], "none")
                    self.assertEqual(metrics["borderWidth"], "0px")
                    self.assertTrue(button.get_attribute("aria-label"))

                    icon_box = button.locator("i").bounding_box()
                    self.assertIsNotNone(icon_box, f"{card_id}: arrow icon did not render")
                    page.mouse.click(
                        icon_box["x"] + icon_box["width"] / 2,
                        icon_box["y"] + icon_box["height"] / 2,
                    )
                    self.assertEqual(button.get_attribute("aria-expanded"), "false")
                    self.assertTrue(page.locator(f"#{card_id} > .card-body").evaluate("el => el.hidden"))
                page.close()

    def test_header_toggles_both_directions_from_anywhere_on_desktop_and_mobile(self):
        for width in (1280, 390):
            with self.subTest(viewport=width):
                page = self.open_page(width)
                for card_id in CARDS:
                    with self.subTest(card=card_id):
                        card = page.locator(f"#{card_id}")
                        if not card.locator("[data-section-toggle]").is_visible():
                            card.evaluate("el => el.style.setProperty('display', 'block', 'important')")
                        header = card.locator(":scope > .section-header")
                        button = header.locator("[data-section-toggle]")
                        title = header.locator(".section-title")
                        body = card.locator(":scope > .card-body")
                        header.scroll_into_view_if_needed()

                        title.click()
                        self.assertEqual(button.get_attribute("aria-expanded"), "false")
                        self.assertTrue(body.evaluate("el => el.hidden"))
                        self.assertFalse(page.evaluate(
                            "id => JSON.parse(localStorage.getItem('aluminum_cut_user_prefs_v1'))"
                            ".sectionExpanded[id]", card_id
                        ))

                        box = header.bounding_box()
                        page.mouse.click(box["x"] + 4, box["y"] + box["height"] / 2)
                        self.assertEqual(button.get_attribute("aria-expanded"), "true")
                        self.assertFalse(body.evaluate("el => el.hidden"))
                        self.assertTrue(page.evaluate(
                            "id => JSON.parse(localStorage.getItem('aluminum_cut_user_prefs_v1'))"
                            ".sectionExpanded[id]", card_id
                        ))

                        page.mouse.click(box["x"] + box["width"] - 4, box["y"] + box["height"] / 2)
                        self.assertEqual(button.get_attribute("aria-expanded"), "false")
                        self.assertTrue(body.evaluate("el => el.hidden"))
                        button.click()
                        self.assertEqual(button.get_attribute("aria-expanded"), "true")
                        button.click()
                        self.assertEqual(button.get_attribute("aria-expanded"), "false")
                page.close()

    def test_section_bars_are_not_locked_to_the_old_44_pixel_height(self):
        for width, expected_visible in ((1280, 3), (390, 4)):
            with self.subTest(viewport=width):
                page = self.open_page(width)
                buttons = self.visible_buttons(page)
                self.assertEqual(len(buttons), expected_visible)
                for card_id, _button in buttons:
                    header = page.locator(f"#{card_id} > .section-header")
                    metrics = header.evaluate(
                        "el => ({height:el.getBoundingClientRect().height,"
                        "minHeight:getComputedStyle(el).minHeight})"
                    )
                    self.assertLessEqual(metrics["height"], 40, f"{card_id}: {metrics}")
                    self.assertNotEqual(metrics["minHeight"], "44px")
                page.close()

    def test_enter_and_space_toggle_independently_and_keep_accessible_state(self):
        page = self.open_page(1280)
        settings = page.locator("#settings-card [data-section-toggle]")
        cutting = page.locator("#cutting-items-card [data-section-toggle]")
        settings.focus()
        page.keyboard.press("Enter")
        self.assertEqual(settings.get_attribute("aria-expanded"), "false")
        self.assertEqual(cutting.get_attribute("aria-expanded"), "true")
        settings.focus()
        page.keyboard.press("Space")
        self.assertEqual(settings.get_attribute("aria-expanded"), "true")
        controls_id = settings.get_attribute("aria-controls")
        self.assertTrue(controls_id)
        self.assertEqual(page.locator(f"#{controls_id}").count(), 1)
        page.close()


if __name__ == "__main__":
    unittest.main(verbosity=2)
