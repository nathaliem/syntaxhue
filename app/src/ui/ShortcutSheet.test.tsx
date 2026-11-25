import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../App";

const sheet = () => document.querySelector<HTMLDialogElement>("dialog.shortcuts");

describe("keyboard shortcuts", () => {
  it("? opens the sheet and Close closes it", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(sheet()?.open).toBeFalsy();
    await user.keyboard("?");
    expect(sheet()?.open).toBe(true);
    expect(sheet()).toHaveTextContent("Shuffle unlocked colors");
    await user.click(within(sheet()!).getByRole("button", { name: "Close" }));
    expect(sheet()?.open).toBeFalsy();
  });

  it("? is ignored while typing in a field", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("textbox", { name: "Theme name" }));
    await user.keyboard("?");
    expect(sheet()?.open).toBeFalsy();
  });

  it("Space does not shuffle while the sheet is open", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.keyboard("?");
    const before = document.querySelector(".role-hex")?.textContent;
    await user.keyboard(" ");
    expect(document.querySelector(".role-hex")?.textContent).toBe(before);
  });

  it("L locks and unlocks the open color", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.keyboard("l");
    expect(screen.queryByRole("button", { name: /^Unlock Keyword/ })).toBeNull();
    await user.click(screen.getByRole("button", { name: /^Keyword/ }));
    await user.keyboard("l");
    expect(screen.getByRole("button", { name: "Unlock Keyword" })).toBeInTheDocument();
    await user.keyboard("l");
    expect(screen.getByRole("button", { name: "Lock Keyword" })).toBeInTheDocument();
  });

  it("Ctrl+E opens Export", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.keyboard("{Control>}e{/Control}");
    expect(document.querySelector<HTMLDialogElement>("dialog.export")?.open).toBe(true);
  });
});
