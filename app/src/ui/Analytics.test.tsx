import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sent: [string, Record<string, string>][] = [];
vi.mock("@vercel/analytics", () => ({ track: (n: string, p: Record<string, string>) => sent.push([n, p]) }));

import App from "../App";
import { resetOnce } from "../analytics";

beforeEach(() => {
  sent.length = 0;
  resetOnce();
});
afterEach(() => vi.restoreAllMocks());

const names = () => sent.map((s) => s[0]);

describe("analytics events", () => {
  it("sends a first shuffle once per visit, and nothing about the colors", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /^Shuffle/ }));
    await user.click(screen.getByRole("button", { name: /^Shuffle/ }));
    expect(sent).toEqual([["shuffle", {}]]);
  });

  it("sends a first hand edit once per visit", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByRole("button", { name: /Keyword/ })[0]);
    const hex = screen.getAllByRole("textbox").find((e) => (e as HTMLInputElement).value.startsWith("#"))!;
    await user.clear(hex);
    await user.type(hex, "#123456{Enter}");
    expect(names().filter((n) => n === "edit")).toHaveLength(1);
    for (const [, p] of sent) expect(JSON.stringify(p)).not.toMatch(/#|Harbor|theme/i);
  });

  it("sends the export kind when the settings snippet is copied, and a share event for the link", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Export" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Copy snippet" }));
    await user.click(within(dialog).getByRole("tab", { name: "Share link" }));
    await user.click(within(dialog).getByRole("button", { name: "Copy link" }));
    expect(sent).toEqual([
      ["export", { type: "settings" }],
      ["share", {}],
    ]);
  });

  it("sends a library_save when a theme is saved", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Library" }));
    await user.click(
      within(screen.getByRole("dialog", { name: "Your themes" })).getByRole("button", { name: "Save current" }),
    );
    await screen.findByRole("list", { name: "Saved themes" });
    expect(sent).toEqual([["library_save", {}]]);
  });

  it("sends nothing at all when Do Not Track is on", async () => {
    Object.defineProperty(navigator, "doNotTrack", { value: "1", configurable: true });
    try {
      const user = userEvent.setup();
      render(<App />);
      await user.click(screen.getByRole("button", { name: /^Shuffle/ }));
      expect(sent).toEqual([]);
    } finally {
      Object.defineProperty(navigator, "doNotTrack", { value: null, configurable: true });
    }
  });
});
