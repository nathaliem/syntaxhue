import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { TARGETS } from "../engine/ports";

let blobs: Blob[] = [];
let downloads: string[] = [];

beforeEach(() => {
  blobs = [];
  downloads = [];
  URL.createObjectURL = vi.fn((b: Blob) => (blobs.push(b), "blob:x"));
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push(this.download);
  });
});
afterEach(() => vi.restoreAllMocks());

async function open(user: ReturnType<typeof userEvent.setup>, tab: "Other editors" | "Terminals") {
  render(<App />);
  await user.click(screen.getByRole("button", { name: "Export" }));
  await user.click(screen.getByRole("tab", { name: tab }));
}
const radio = (name: string) => screen.getByRole("radio", { name });
const shown = () => screen.getByRole("group", { name: /^(Editor|Terminal)$/ });

describe("Export > Other editors and Terminals", () => {
  it("lists every registered editor port, and every terminal, as radio choices", async () => {
    const user = userEvent.setup();
    await open(user, "Other editors");
    for (const x of TARGETS.filter((t) => t.group !== "terminal")) expect(radio(x.label)).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Kitty" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Terminals" }));
    for (const x of TARGETS.filter((t) => t.group === "terminal")) expect(radio(x.label)).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Zed" })).not.toBeInTheDocument();
    expect(shown()).toBeInTheDocument();
  });

  it("shows what the choice is, where it goes and its file, and changes with the choice", async () => {
    const user = userEvent.setup();
    await open(user, "Other editors");
    await user.click(radio("Zed"));
    expect(screen.getByText(/~\/\.config\/zed\/themes/)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /\.json$/ })).toBeInTheDocument();
    await user.click(radio("Sublime Text"));
    expect(screen.getByRole("region", { name: /\.sublime-color-scheme$/ })).toBeInTheDocument();
    expect(screen.queryByText(/~\/\.config\/zed\/themes/)).not.toBeInTheDocument();
  });

  it("copies exactly the file that is shown", async () => {
    const user = userEvent.setup();
    await open(user, "Terminals");
    await user.click(radio("Kitty"));
    const text = screen.getByRole("region", { name: /\.conf$/ }).querySelector("pre")!.textContent!;
    await user.click(screen.getByRole("button", { name: "Copy" }));
    expect(await navigator.clipboard.readText()).toBe(text);
    expect(screen.getByText(/^Copied .*\.conf$/)).toBeInTheDocument();
  });

  it("downloads the file under its own name, without the folder", async () => {
    const user = userEvent.setup();
    await open(user, "Other editors");
    await user.click(radio("Neovim"));
    await user.click(screen.getByRole("button", { name: /^Download .*\.lua$/ }));
    expect(downloads).toHaveLength(1);
    expect(downloads[0]).toMatch(/^[a-z0-9-]+\.lua$/);
    expect(await blobs[0].text()).toContain("nvim_set_hl");
  });

  it("is usable from the keyboard: arrow keys move between choices, the file is focusable", async () => {
    const user = userEvent.setup();
    await open(user, "Terminals");
    radio("Windows Terminal").focus();
    await user.keyboard("{ArrowDown}");
    expect(radio("iTerm2")).toBeChecked();
    const pre = screen.getByLabelText(/^Contents of /);
    expect(pre).toHaveAttribute("tabindex", "0");
  });

  it("follows the theme: the shown file contains the current colors", async () => {
    const user = userEvent.setup();
    await open(user, "Other editors");
    await user.click(radio("Palette (JSON)"));
    const text = screen.getByLabelText(/^Contents of /).textContent!;
    expect(JSON.parse(text).name).toBe((screen.getByRole("textbox", { name: "Theme name" }) as HTMLInputElement).value);
  });
});
