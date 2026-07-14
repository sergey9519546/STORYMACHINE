from __future__ import annotations

import json
import math
import re
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE_URL = "http://127.0.0.1:4182/"
OUT = Path("output/playwright")
OUT.mkdir(parents=True, exist_ok=True)

VIEWPORTS = {
    "mobile": {"width": 390, "height": 844},
    "tablet": {"width": 768, "height": 1024},
    "desktop": {"width": 1440, "height": 900},
}


def text_name(el):
    return (
        el.get_attribute("aria-label")
        or el.get_attribute("title")
        or el.inner_text(timeout=500)
        or el.get_attribute("placeholder")
        or el.evaluate("el => el.tagName")
    ).strip().replace("\n", " ")[:100]


def inspect_page(page, name):
    page.wait_for_timeout(500)
    dims = page.evaluate(
        """() => ({
          width: innerWidth,
          height: innerHeight,
          docWidth: document.documentElement.scrollWidth,
          docHeight: document.documentElement.scrollHeight,
          bodyWidth: document.body.scrollWidth
        })"""
    )
    # Exclude elements inside aria-hidden containers (e.g. off-screen sidebar
    # drawers whose children have negative x positions via translate-x).
    # Also exclude hidden/shadow DOM children.
    visible_controls = page.locator(
        "button:not([hidden]), a[href]:not([hidden]), input:not([type=hidden]), select, textarea, [role=button]"
    )
    small = []
    clipped = []
    unnamed = []
    for i in range(visible_controls.count()):
        el = visible_controls.nth(i)
        try:
            if not el.is_visible():
                continue
            # Skip elements inside aria-hidden containers — they are
            # intentionally removed from the accessibility tree and may be
            # translated off-screen (e.g. the sidebar drawer at -translate-x).
            is_aria_hidden = el.evaluate(
                """el => {
                    let node = el;
                    while (node && node !== document.body) {
                        if (node.getAttribute && node.getAttribute('aria-hidden') === 'true') return true;
                        node = node.parentElement;
                    }
                    return false;
                }"""
            )
            if is_aria_hidden:
                continue
            box = el.bounding_box()
            if not box:
                continue
            label = text_name(el)
            if box["width"] < 44 or box["height"] < 44:
                small.append({"name": label, **{k: round(v, 1) for k, v in box.items()}})
            if box["x"] < -0.5 or box["x"] + box["width"] > dims["width"] + 0.5:
                clipped.append({"name": label, **{k: round(v, 1) for k, v in box.items()}})
            if not label:
                unnamed.append({"tag": el.evaluate("el => el.tagName"), **box})
        except Exception as exc:
            small.append({"inspection_error": str(exc), "index": i})

    headings = page.locator("h1, h2, h3, h4, h5, h6")
    heading_list = []
    for i in range(headings.count()):
        h = headings.nth(i)
        if h.is_visible():
            heading_list.append({"tag": h.evaluate("el => el.tagName"), "text": h.inner_text()[:120]})

    page.screenshot(path=str(OUT / f"{name}.png"), full_page=False)
    return {
        "name": name,
        "url": page.url,
        "title": page.title(),
        "dimensions": dims,
        "horizontal_overflow": dims["docWidth"] > dims["width"] + 1,
        "small_controls": small,
        "clipped_controls": clipped,
        "unnamed_controls": unnamed,
        "headings": heading_list,
    }


def wait_loaded(page):
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_timeout(1000)


def wait_for_start(page):
    page.get_by_role("button", name=re.compile("Try The Sample Script", re.I)).wait_for(timeout=15000)


def fresh(page, viewport):
    page.set_viewport_size(viewport)
    page.goto(BASE_URL, wait_until="domcontentloaded", timeout=15000)
    wait_loaded(page)
    page.evaluate("() => { localStorage.clear(); sessionStorage.clear(); }")
    page.reload(wait_until="domcontentloaded", timeout=15000)
    wait_loaded(page)
    wait_for_start(page)


def click_named(page, role, pattern):
    loc = page.get_by_role(role, name=re.compile(pattern, re.I))
    loc.first.click()
    page.wait_for_timeout(600)


def main():
    report = {"screens": [], "flows": [], "console": [], "page_errors": [], "request_failures": []}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport=VIEWPORTS["desktop"], reduced_motion="reduce")
        page = context.new_page()
        page.on("console", lambda msg: report["console"].append({"type": msg.type, "text": msg.text, "url": page.url}))
        page.on("pageerror", lambda exc: report["page_errors"].append({"text": str(exc), "url": page.url}))
        page.on("requestfailed", lambda req: report["request_failures"].append({"url": req.url, "failure": req.failure, "page": page.url}))

        for viewport_name, viewport in VIEWPORTS.items():
            fresh(page, viewport)
            report["screens"].append(inspect_page(page, f"start-{viewport_name}"))

        # Wizard: inspect each step on mobile and desktop.
        for viewport_name in ("mobile", "desktop"):
            viewport = VIEWPORTS[viewport_name]
            fresh(page, viewport)
            click_named(page, "button", "Start a new story")
            report["screens"].append(inspect_page(page, f"wizard-step1-{viewport_name}"))
            theme = page.get_by_placeholder(re.compile("detective haunted", re.I))
            theme.fill("A locksmith discovers every repaired lock erases one memory")
            for step in range(2, 6):
                click_named(page, "button", "^Next$")
                report["screens"].append(inspect_page(page, f"wizard-step{step}-{viewport_name}"))
            click_named(page, "button", "Begin Sequence")
            report["screens"].append(inspect_page(page, f"editor-from-wizard-{viewport_name}"))

        # Empty editor shell and its main toggles.
        for viewport_name in ("mobile", "tablet", "desktop"):
            viewport = VIEWPORTS[viewport_name]
            fresh(page, viewport)
            click_named(page, "button", "I Have A Script")
            report["screens"].append(inspect_page(page, f"editor-empty-{viewport_name}"))

            for button_name, screen_key in [
                ("Show side panels", "side-panels"),
                ("Show Director HUD", "director-hud"),
                ("Show Script Doctor", "doctor-empty"),
                ("Show Slate", "slate"),
            ]:
                candidate = page.get_by_role("button", name=re.compile(button_name, re.I))
                if candidate.count() and candidate.first.is_visible():
                    try:
                        candidate.first.click()
                        page.wait_for_timeout(800)
                        report["screens"].append(inspect_page(page, f"editor-{screen_key}-{viewport_name}"))
                        close = page.get_by_role("button", name=re.compile("close", re.I))
                        if close.count() and close.first.is_visible():
                            close.first.click()
                            page.wait_for_timeout(300)
                        elif screen_key == "side-panels":
                            hide = page.get_by_role("button", name=re.compile("Hide side panels", re.I))
                            if hide.count():
                                hide.first.click()
                    except Exception as exc:
                        report["flows"].append({"flow": f"open-{screen_key}-{viewport_name}", "error": str(exc)})

        # Sample diagnosis result.
        for viewport_name in ("mobile", "desktop"):
            fresh(page, VIEWPORTS[viewport_name])
            click_named(page, "button", "Try The Sample Script")
            page.wait_for_timeout(3500)
            report["screens"].append(inspect_page(page, f"doctor-sample-{viewport_name}"))

        # Story Machine shell and a representative selection of overlays.
        for viewport_name in ("mobile", "desktop"):
            fresh(page, VIEWPORTS[viewport_name])
            click_named(page, "button", "Open OASIS Story Machine")
            try:
                page.get_by_role("heading", name=re.compile("Story Machine", re.I)).wait_for(timeout=20000)
            except Exception as exc:
                report["flows"].append({"flow": f"storymachine-load-{viewport_name}", "error": str(exc)})
                continue
            report["screens"].append(inspect_page(page, f"storymachine-{viewport_name}"))
            for pattern, key in [
                ("AI Provider Settings", "settings"),
                ("What-If", "whatif"),
                ("Writers' Room", "room"),
                ("Character Interview", "interview"),
                ("Build Scenario", "scenario-builder"),
            ]:
                button = page.get_by_role("button", name=re.compile(pattern, re.I))
                if button.count() and button.first.is_visible():
                    try:
                        button.first.click()
                        page.wait_for_timeout(700)
                        report["screens"].append(inspect_page(page, f"storymachine-{key}-{viewport_name}"))
                        close = page.get_by_role("button", name=re.compile("close|cancel", re.I))
                        if close.count() and close.first.is_visible():
                            close.first.click()
                            page.wait_for_timeout(250)
                    except Exception as exc:
                        report["flows"].append({"flow": f"storymachine-{key}-{viewport_name}", "error": str(exc)})

        # Design-system preview at desktop and mobile.
        for viewport_name in ("mobile", "desktop"):
            page.set_viewport_size(VIEWPORTS[viewport_name])
            page.goto(BASE_URL + "#design-preview", wait_until="domcontentloaded", timeout=15000)
            wait_loaded(page)
            report["screens"].append(inspect_page(page, f"design-preview-{viewport_name}"))

        browser.close()

    # Deduplicate noisy browser events while preserving samples.
    for key in ("console", "page_errors", "request_failures"):
        seen = set()
        unique = []
        for item in report[key]:
            token = json.dumps(item, sort_keys=True)
            if token not in seen:
                seen.add(token)
                unique.append(item)
        report[key] = unique

    (OUT / "whole-site-qa.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({
        "screens": len(report["screens"]),
        "flow_errors": len(report["flows"]),
        "console_messages": len(report["console"]),
        "page_errors": len(report["page_errors"]),
        "request_failures": len(report["request_failures"]),
        "horizontal_overflow_screens": [s["name"] for s in report["screens"] if s["horizontal_overflow"]],
        "screens_with_clipped_controls": [s["name"] for s in report["screens"] if s["clipped_controls"]],
    }, indent=2))


if __name__ == "__main__":
    main()
