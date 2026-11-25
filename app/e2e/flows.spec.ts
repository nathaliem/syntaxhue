import { expect, test, type Page } from "@playwright/test";

const COLOR = "#12ab34";

async function start(page: Page) {
  await page.addInitScript(() => {
    // Only on first load, so a reload keeps what the app stored.
    if (!localStorage.getItem("hueprint:coach")) localStorage.setItem("hueprint:coach", "done");
  });
  await page.goto("/");
  await expect(page.getByRole("button", { name: /^Shuffle/ }).first()).toBeVisible();
}
const themeName = (page: Page) => page.locator("label.name input").inputValue();
const shuffle = (page: Page) =>
  page
    .getByRole("button", { name: /^Shuffle/ })
    .first()
    .click();

/** Sets the keyword color through the role editor's hex field. */
async function setKeyword(page: Page, hex: string) {
  await page
    .getByRole("button", { name: /Keyword/ })
    .first()
    .click();
  const field = page.locator(".hex-in input").first();
  await field.fill(hex);
  await field.press("Enter");
  await expect(field).toHaveValue(hex);
}

async function snippetText(page: Page) {
  await page.getByRole("button", { name: "Export" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return { dialog, text: await dialog.locator("pre.code").innerText() };
}

test("shuffle, edit a color, copy the settings snippet", async ({ page, context, browserName }) => {
  if (browserName === "chromium") await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await start(page);
  const first = await themeName(page);
  await shuffle(page);
  await expect.poll(() => themeName(page)).not.toBe(first);
  await setKeyword(page, COLOR);

  const { dialog, text } = await snippetText(page);
  expect(text).toContain("workbench.colorCustomizations");
  expect(text.toLowerCase()).toContain(COLOR);
  await dialog.getByRole("button", { name: "Copy snippet" }).click();
  await expect(dialog.getByText(/Copied snippet|Couldn't copy/)).toBeVisible();
  if (browserName === "chromium") {
    await expect(dialog.getByText("Copied snippet")).toBeVisible();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip.toLowerCase()).toContain(COLOR);
    // After a copy the page shows the how-to guide.
    await expect(dialog.getByRole("note")).toContainText("Colors didn't change?");
  }
});

test("share link opens the same theme for someone else", async ({ page, browser }) => {
  await start(page);
  await shuffle(page);
  await setKeyword(page, COLOR);
  const name = await themeName(page);
  const { dialog } = await snippetText(page);
  await dialog.getByRole("tab", { name: "Share link" }).click();
  const link = await dialog.getByLabel("Share link").inputValue();
  expect(link).toContain("#");

  // A different person: a fresh browser context with nothing stored.
  const other = await browser.newContext();
  const page2 = await other.newPage();
  await page2.addInitScript(() => localStorage.setItem("hueprint:coach", "done"));
  await page2.goto(link);
  await expect(page2.getByText("You opened a shared theme.")).toBeVisible();
  expect(await themeName(page2)).toBe(name);
  await page2
    .getByRole("button", { name: /Keyword/ })
    .first()
    .click();
  await expect(page2.locator(".hex-in input").first()).toHaveValue(COLOR);

  // They can keep it, and it is in their library afterwards.
  await page2.getByRole("button", { name: "Save to library" }).click();
  await page2.getByRole("button", { name: "Library", exact: true }).click();
  await expect(
    page2.getByRole("dialog", { name: "Your themes" }).getByRole("button", { name: `Open ${name}` }),
  ).toBeVisible();
  await other.close();
});

test("save to the library, change the theme, reload, reopen the saved one", async ({ page }) => {
  await start(page);
  await shuffle(page);
  await setKeyword(page, COLOR);
  const saved = await themeName(page);

  await page.getByRole("button", { name: "Library", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Your themes" });
  await drawer.getByRole("button", { name: "Save current" }).click();
  await expect(drawer.getByRole("button", { name: `Open ${saved}` })).toBeVisible();
  await drawer.getByRole("button", { name: "Close" }).click();

  // Move on to a different theme, then close and reopen the app.
  await shuffle(page);
  await expect.poll(() => themeName(page)).not.toBe(saved);
  await page.reload();
  await expect(page.getByRole("button", { name: /^Shuffle/ }).first()).toBeVisible();

  await page.getByRole("button", { name: "Library", exact: true }).click();
  await drawer.getByRole("button", { name: `Open ${saved}` }).click();
  await expect.poll(() => themeName(page)).toBe(saved);
  await page
    .getByRole("button", { name: /Keyword/ })
    .first()
    .click();
  await expect(page.locator(".hex-in input").first()).toHaveValue(COLOR);
});
