import { expect, test } from "@playwright/test";

test("interface colors: fade on change and can be pinned", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("hueprint:coach", "done"));
  await page.goto("/");
  const app = page.locator(".app");
  const startMode = await app.getAttribute("data-mode");
  const other = startMode === "dark" ? "Light" : "Dark";

  await page.getByRole("button", { name: other, exact: true }).click();
  await expect(app).toHaveClass(/chrome-swap/);
  // During the swap the interface fades its colors, then goes back to normal.
  const during = await page.evaluate(() => getComputedStyle(document.querySelector(".bar .btn")!).transitionProperty);
  expect(during).toContain("background-color");
  await expect(app).not.toHaveClass(/chrome-swap/);
  await expect(app).toHaveAttribute("data-mode", other.toLowerCase());

  // Pin the interface to dark, then give the theme light colors: the preview turns light, the interface stays dark.
  await page.getByRole("button", { name: /^Vibe/ }).click();
  await page.getByLabel("Interface colors").selectOption("dark");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Light", exact: true }).click();
  await expect(app).toHaveAttribute("data-mode", "dark");
  const colors = await page.evaluate(() => ({
    paper: getComputedStyle(document.querySelector(".app")!).backgroundColor,
    editor: getComputedStyle(document.querySelector(".wb .wb-title")!).backgroundColor,
  }));
  expect(colors.paper).not.toBe(colors.editor);
  await page.screenshot({ path: "test-results/chrome-pinned-dark-light-theme.png" });
});
