import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../App";

const lang = (name: string) => screen.getByRole("button", { name });
const footer = () => document.querySelector(".wb-status")!;
const editor = () => document.querySelector(".wb-editor")!;

describe("preview language switcher", () => {
  it("starts on TypeScript with eight choices", () => {
    render(<App />);
    expect(lang("TypeScript")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("group", { name: "Preview language" }).querySelectorAll("button")).toHaveLength(8);
    expect(footer()).toHaveTextContent("TypeScript");
  });

  it("switches the sample, file name and status bar, and colors the new code", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(lang("Python"));
    expect(lang("Python")).toHaveAttribute("aria-pressed", "true");
    expect(lang("TypeScript")).toHaveAttribute("aria-pressed", "false");
    expect(footer()).toHaveTextContent("Python");
    expect(document.querySelector(".wb-tab.active")).toHaveTextContent("shuffle.py");
    expect(editor()).toHaveTextContent("def shuffle");
    // the grammar is fetched on demand; once it is in, tokens carry roles
    await waitFor(() => expect(editor()).not.toHaveAttribute("data-loading"));
    const keywords = [...editor().querySelectorAll('[data-role="keyword"]')].map((e) => e.textContent);
    expect(keywords).toContain("def");
  });

  it("clicking a token in any language still opens its role", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(lang("Rust"));
    await waitFor(() => expect(editor()).not.toHaveAttribute("data-loading"));
    await user.click(editor().querySelector('[data-role="string"]')!);
    expect(screen.getByRole("button", { name: /^String/ })).toHaveAttribute("aria-expanded", "true");
  });
});
