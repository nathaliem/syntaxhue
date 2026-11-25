import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../App";
import { setViewportWidth } from "../test/setup";

describe("app shell breakpoints", () => {
  it("desktop: full rail with inline editor and a Library button in the bar", async () => {
    setViewportWidth(1440);
    render(<App />);
    expect(screen.getByRole("button", { name: "Library" })).toBeInTheDocument();
    expect(document.querySelector(".rail-compact")).toBeNull();
    expect(screen.queryByRole("button", { name: "More actions" })).toBeNull();
  });

  it("tablet: compact rail, editor opens in a popover, Undo/Redo fold into a menu below 1100", async () => {
    setViewportWidth(850);
    const user = userEvent.setup();
    render(<App />);
    expect(document.querySelector(".rail-compact")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
    await user.click(screen.getByRole("button", { name: /^Keyword/ }));
    expect(screen.getByRole("dialog", { name: "Edit Keyword" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Edit Keyword" })).toBeNull();
  });

  it("tablet at 1150 keeps Undo and Redo in the bar", () => {
    setViewportWidth(1150);
    render(<App />);
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
  });

  it("mobile: swatch strip and thumb bar replace the rail; the menu holds Library", async () => {
    setViewportWidth(390);
    const user = userEvent.setup();
    render(<App />);
    expect(document.querySelector(".rail")).toBeNull();
    expect(document.querySelector(".thumb-bar")).not.toBeNull();
    expect(screen.getAllByRole("list", { name: "Theme colors" })).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "More actions" }));
    expect(screen.getByRole("button", { name: "Library" })).toBeInTheDocument();
  });

  it("mobile sheet has a Lock button that toggles the role", async () => {
    setViewportWidth(390);
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /^Keyword/ }));
    await user.click(screen.getByRole("button", { name: "Lock" }));
    expect(screen.getByRole("button", { name: /^Keyword.*locked/ })).toBeInTheDocument();
    expect(within(document.body).getByRole("button", { name: "Unlock" })).toBeInTheDocument();
  });

  it("switches layout live when the window is resized", () => {
    setViewportWidth(1440);
    render(<App />);
    act(() => setViewportWidth(390));
    expect(document.querySelector(".thumb-bar")).not.toBeNull();
  });
});
