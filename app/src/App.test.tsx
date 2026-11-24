import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";
import { ROLES } from "./engine/theme";

describe("app shell (smoke)", () => {
  it("renders the top bar, role rail and preview", () => {
    render(<App />);
    expect(screen.getByText("Hueprint")).toBeInTheDocument();
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
