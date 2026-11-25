import { expect, test, type Page } from "@playwright/test";

/**
 * Presses Tab until the focused element satisfies `cond` (a JavaScript expression using `el`), giving up after `max`
 * presses: that would be a keyboard trap or a missing tab stop.
 */
async function tabTo(page: Page, cond: string, max = 60, key = "Tab") {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press(key);
    const hit = await page.evaluate((c) => {
      const el = document.activeElement as HTMLElement;
      const label = (el.getAttribute("aria-label") ?? el.textContent ?? "").trim();
      return !!new Function("el", "label", `return (${c})`)(el, label);
    }, cond);
    if (hit) return i + 1;
  }
  throw new Error(`Tab never reached: ${cond}`);
}

test("shuffle, open a role, adjust, lock and export with the keyboard alone", async ({ page, browserName }) => {
  // Safari (and so WebKit) doesn't put buttons in the Tab order unless "Press Tab to highlight each item" is on.
  test.skip(browserName === "webkit", "WebKit skips buttons when tabbing by default");
  const mod = process.platform === "darwin" ? "Meta" : "Control";
  await page.addInitScript(() => localStorage.setItem("hueprint:coach", "done"));
  await page.goto("/");
  await expect(page.getByRole("button", { name: /^Shuffle/ }).first()).toBeVisible();
  const name = () => page.locator("label.name input").inputValue();

  // Shuffle is a real stop in the tab order, and Enter works on it.
  const before = await name();
  const stops = await tabTo(page, "/^Shuffle/.test(label)");
  expect(stops).toBeLessThan(12);
  await page.keyboard.press("Enter");
  await expect.poll(name).not.toBe(before);

  // A color row: reachable, opens with Enter, lights up its elements in the preview while focused.
  await tabTo(page, "el.classList.contains('role-main') && /Keyword/.test(label)");
  await page.keyboard.press("Enter");
  await expect(page.locator(".role-main[aria-expanded=true]")).toContainText("Keyword");
  await expect(page.locator(".wb")).toHaveAttribute("data-hl", "keyword");

  // The sliders take arrow keys and change the color.
  const hex = page.locator(".hex-in input").first();
  const start = await hex.inputValue();
  await tabTo(page, "el.tagName === 'INPUT' && el.type === 'range'");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => hex.inputValue()).not.toBe(start);

  // Lock with the L shortcut from the row, and with the lock button.
  await page.locator(".role-main[aria-expanded=true]").focus();
  await page.keyboard.press("l");
  await expect(page.getByRole("button", { name: "Unlock Keyword" })).toHaveAttribute("aria-pressed", "true");
  await tabTo(page, "label === 'Unlock Keyword'");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Lock Keyword" })).toHaveAttribute("aria-pressed", "false");

  // Export by shortcut; focus never reaches the page behind the dialog; Escape closes it and focus is not lost.
  await page.keyboard.press(`${mod}+e`);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Tab");
    // A modal dialog makes the page behind it inert, so focus is in the dialog or briefly on the browser's own UI (body).
    expect(
      await page.evaluate(
        () => document.activeElement === document.body || !!document.activeElement?.closest("dialog"),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  expect(await page.evaluate(() => document.activeElement !== document.body)).toBe(true);

  // And by Shift+Tab back up to the Export button (Tab onward would leave the page for the browser's own UI).
  await tabTo(page, "label === 'Export'", 80, "Shift+Tab");
  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
});
