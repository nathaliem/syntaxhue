import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../App";
import { setMobile } from "../test/setup";
import { settle } from "./sheetSnap";

describe("settle", () => {
  it("swipes up to full, down to half, down again to close; small moves stay put", () => {
    expect(settle("half", -80)).toBe("full");
    expect(settle("full", 80)).toBe("half");
    expect(settle("half", 80)).toBe("close");
    expect(settle("half", 20)).toBe("half");
    expect(settle("full", -80)).toBe("full");
  });
});

describe("mobile editor", () => {
  const sheet = () => screen.queryByRole("region", { name: /^Edit / });

  it("opens in a bottom sheet instead of under the row", async () => {
    setMobile(true);
    const user = userEvent.setup();
    render(<App />);
    expect(sheet()).toBeNull();
    await user.click(screen.getByRole("button", { name: /^Keyword/ }));
    expect(sheet()).toHaveAccessibleName("Edit Keyword");
    expect(sheet()!.querySelector("#edit-keyword")).not.toBeNull();
    expect(document.querySelectorAll(".role .editor")).toHaveLength(0);
    expect(sheet()).toHaveAttribute("data-snap", "half");
  });

  it("keeps the inline editor on desktop", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /^Keyword/ }));
    expect(sheet()).toBeNull();
    expect(document.querySelectorAll(".role .editor")).toHaveLength(1);
  });

  it("edits the color from the sheet and closes with Done or Esc", async () => {
    setMobile(true);
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /^Keyword/ }));
    const input = screen.getByRole("textbox", { name: "Hex color" });
    await user.clear(input);
    await user.type(input, "#102030");
    await user.tab();
    expect(screen.getByRole("button", { name: /^Keyword/ })).toHaveAccessibleName(/#102030/i);
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(sheet()).toBeNull();
    await user.click(screen.getByRole("button", { name: /^String/ }));
    expect(sheet()).not.toBeNull();
    await user.keyboard("{Escape}");
    expect(sheet()).toBeNull();
  });

  it("the handle toggles between 55 % and 90 %", async () => {
    setMobile(true);
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /^Keyword/ }));
    await user.click(screen.getByRole("button", { name: "Make the editor taller" }));
    expect(sheet()).toHaveAttribute("data-snap", "full");
    await user.click(screen.getByRole("button", { name: "Make the editor smaller" }));
    expect(sheet()).toHaveAttribute("data-snap", "half");
  });

  it("switches to the editor layout when the screen gets narrow", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /^Keyword/ }));
    expect(sheet()).toBeNull();
    act(() => setMobile(true));
    expect(sheet()).not.toBeNull();
    expect(document.querySelectorAll(".role .editor")).toHaveLength(0);
  });
});
