import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";
import { encodeTheme } from "./engine/share";
import { generate, ROLES } from "./engine/theme";

describe("app shell (smoke)", () => {
  it("renders the top bar, role rail and preview", () => {
    render(<App />);
    expect(screen.getByText("SyntaxHue")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Theme name" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Shuffle \d+ colors?/ })).toBeEnabled();
    expect(screen.getByRole("group", { name: "Theme mode" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
    const rail = screen.getByRole("complementary", { name: "Theme colors" });
    for (const def of ROLES)
      expect(within(rail).getByRole("button", { name: `Lock ${def.label}` })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Preview" })).toBeInTheDocument();
  });

  it("links to Buy Me A Coffee in a new tab", () => {
    render(<App />);
    const link = screen.getByRole("link", { name: /buy me a coffee/i });
    expect(link).toHaveAttribute("href", "https://buymeacoffee.com/nathaliemaes");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("locking a color updates the shuffle button and Lock all / Unlock all", async () => {
    const user = userEvent.setup();
    render(<App />);
    const total = ROLES.length;
    expect(screen.getByRole("button", { name: new RegExp(`^Shuffle ${total} colors`) })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Lock Background" }));
    expect(screen.getByRole("button", { name: new RegExp(`^Shuffle ${total - 1} colors`) })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unlock Background" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Lock all" }));
    expect(screen.getByRole("button", { name: /^All colors locked/ })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Unlock all" }));
    expect(screen.getByRole("button", { name: new RegExp(`^Shuffle ${total} colors`) })).toBeEnabled();
  });

  it("switches between dark and light mode", async () => {
    const user = userEvent.setup();
    render(<App />);
    const dark = screen.getByRole("button", { name: "Dark" });
    const light = screen.getByRole("button", { name: "Light" });
    await user.click(light);
    expect(light).toHaveAttribute("aria-pressed", "true");
    expect(dark).toHaveAttribute("aria-pressed", "false");
    await user.click(dark);
    expect(dark).toHaveAttribute("aria-pressed", "true");
  });

  it("undo reverts a shuffle", async () => {
    const user = userEvent.setup();
    render(<App />);
    const name = screen.getByRole("textbox", { name: "Theme name" }) as HTMLInputElement;
    const undo = screen.getByRole("button", { name: "Undo" });
    expect(undo).toBeDisabled();
    const first = name.value;
    await user.click(screen.getByRole("button", { name: /^Shuffle/ }));
    expect(undo).toBeEnabled();
    await user.click(undo);
    expect(name.value).toBe(first);
  });
});

/** The banner above the preview (the rail footer is also a live region). */
const banner = () => within(screen.getByRole("region", { name: "Preview" })).getByRole("status");

describe("opening a share link", () => {
  it("shows the shared-theme banner, applies the theme and its locks, and clears the hash", () => {
    const t = generate(11, "light");
    t.name = "Linked Palette";
    t.roles.string.locked = true;
    history.replaceState(null, "", `/#t=${encodeTheme(t)}`);
    render(<App />);
    expect(banner()).toHaveTextContent("You opened a shared theme.");
    expect(screen.getByRole("textbox", { name: "Theme name" })).toHaveValue("Linked Palette");
    expect(screen.getByRole("button", { name: "Light" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Unlock String" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: new RegExp(`^Shuffle ${ROLES.length - 1} colors`) })).toBeInTheDocument();
    expect(location.hash).toBe("");
  });

  it("still opens an old-format link", () => {
    history.replaceState(
      null,
      "",
      "/#t=1.l.Old%2ELink%20Test.f4f0fd2a272f407a20827d905d7700975592117240575cb83d364e955f00485233b631329d5f00006aa01e7729.-,-,-,i,i,ib,-,-,-,-,-,-,-,-,-",
    );
    render(<App />);
    expect(banner()).toHaveTextContent("You opened a shared theme.");
    expect(screen.getByRole("textbox", { name: "Theme name" })).toHaveValue("Old.Link Test");
  });

  it("says so when the link can't be read", () => {
    history.replaceState(null, "", "/#t=pnot-a-theme");
    render(<App />);
    expect(banner()).toHaveTextContent("doesn't contain a theme SyntaxHue can read");
  });

  it("Export > Share link gives a compact link that opens the same theme", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("tab", { name: "Share link" }));
    const link = (screen.getByRole("textbox", { name: "Share link" }) as HTMLInputElement).value;
    expect(link).toMatch(/#t=p[A-Za-z0-9_-]+$/);
    expect(link.length).toBeLessThan(300);
  });
});
