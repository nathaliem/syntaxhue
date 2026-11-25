import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import App from "./App";
import { setViewportWidth } from "./test/setup";

/** Runs axe on the whole document. Color contrast needs real layout, so it is checked in the browser instead. */
async function violations() {
  const result = await axe.run(document.body, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] },
    rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
  });
  return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
}

describe("automated accessibility checks (axe)", () => {
  it.each([
    ["desktop", 1440],
    ["tablet", 900],
    ["mobile", 390],
  ])("%s layout has no violations", async (_name, width) => {
    setViewportWidth(width);
    render(<App />);
    expect(await violations()).toEqual([]);
  });

  it("with the Export dialog open", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Export" }));
    expect(await violations()).toEqual([]);
  });

  it("with the Library drawer open", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Library" }));
    expect(await violations()).toEqual([]);
  });

  it("with the Vibe popover and the shortcut sheet open", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /^Vibe/ }));
    expect(await violations()).toEqual([]);
    await user.keyboard("{Escape}");
    await user.keyboard("?");
    expect(await violations()).toEqual([]);
  });

  it("with a role editor open on desktop, tablet and mobile", async () => {
    for (const width of [1440, 900, 390]) {
      setViewportWidth(width);
      const user = userEvent.setup();
      const { unmount } = render(<App />);
      await user.click(screen.getByRole("button", { name: /^Keyword/ }));
      expect(await violations(), `width ${width}`).toEqual([]);
      unmount();
    }
  });

  it("with the first-run tips showing", async () => {
    localStorage.removeItem("hueprint:coach");
    render(<App />);
    expect(await violations()).toEqual([]);
  });
});
