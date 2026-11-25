import { expect, test, type Page } from "@playwright/test";

/** Loads the app past the first-run coach marks and collects anything that goes wrong on the way. */
async function open(page: Page) {
  const problems: string[] = [];
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  // A 404 console line carries no URL, so failed requests are collected on their own (Vercel's analytics script only exists on Vercel).
  page.on(
    "console",
    (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && problems.push(`console: ${m.text()}`),
  );
  page.on(
    "response",
    (r) => r.status() >= 400 && !r.url().includes("/_vercel/") && problems.push(`${r.status()} ${r.url()}`),
  );
  await page.addInitScript(() => localStorage.setItem("hueprint:coach", "done"));
  await page.goto("/");
  await expect(page.getByRole("button", { name: /^Shuffle/ }).first()).toBeVisible();
  return problems;
}

test("loads without errors and shuffles", async ({ page }) => {
  const problems = await open(page);
  const before = await page.locator("body").innerText();
  await page
    .getByRole("button", { name: /^Shuffle/ })
    .first()
    .click();
  await expect.poll(() => page.locator("body").innerText()).not.toBe(before);
  expect(problems).toEqual([]);
});

test("range sliders: custom track and thumb render, and moving them changes the color", async ({ page }, info) => {
  await open(page);
  await page
    .getByRole("button", { name: /Keyword/ })
    .first()
    .click();
  const slider = page.locator(".slider input[type=range]").first();
  await expect(slider).toBeVisible();
  const style = await slider.evaluate((el) => {
    const s = getComputedStyle(el);
    return { appearance: s.appearance || s.webkitAppearance, height: s.height, bg: s.backgroundImage };
  });
  expect(style.appearance).toBe("none");
  expect(style.height).toBe("12px");
  expect(style.bg).toContain("gradient");
  const hex = page.locator(".hex-in input").first();
  const before = await hex.inputValue();
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => hex.inputValue()).not.toBe(before);
  await page
    .locator(".editor")
    .first()
    .screenshot({ path: `test-results/editor-${info.project.name}.png` });
});

test("eyedropper: the button only shows where the browser has EyeDropper", async ({ page }) => {
  const problems = await open(page);
  await page
    .getByRole("button", { name: /Keyword/ })
    .first()
    .click();
  const supported = await page.evaluate(() => "EyeDropper" in window);
  await expect(page.getByRole("button", { name: "Pick from screen" })).toHaveCount(supported ? 1 : 0);
  expect(problems).toEqual([]);
  // The hex field is the fallback everywhere.
  await expect(page.locator(".hex-in input").first()).toBeVisible();
});

test("export dialog opens as a modal, shows the snippet, and copy either works or says it didn't", async ({
  page,
  context,
  browserName,
}) => {
  await open(page);
  if (browserName === "chromium") await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Export" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("pre.code")).toContainText("workbench.colorCustomizations");
  await dialog.getByRole("button", { name: "Copy snippet" }).click();
  await expect(dialog.getByText(/Copied snippet|Couldn't copy/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("modern CSS used by the chrome resolves (color-mix, focus-visible, dialog backdrop)", async ({ page }) => {
  await open(page);
  const ok = await page.evaluate(() => ({
    colorMix: CSS.supports("color", "color-mix(in srgb, red 50%, blue)"),
    focusVisible: CSS.supports("selector(:focus-visible)"),
    dialog: typeof HTMLDialogElement !== "undefined" && "showModal" in HTMLDialogElement.prototype,
    popover: "showPopover" in HTMLElement.prototype,
  }));
  expect(ok.colorMix).toBe(true);
  expect(ok.focusVisible).toBe(true);
  expect(ok.dialog).toBe(true);
  test.info().annotations.push({ type: "popover", description: String(ok.popover) });
});
