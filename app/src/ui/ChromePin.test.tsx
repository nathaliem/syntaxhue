import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../App";

const app = () => document.querySelector(".app") as HTMLElement;

beforeEach(() => localStorage.removeItem("hueprint:chrome"));
afterEach(() => localStorage.removeItem("hueprint:chrome"));

async function chooseChrome(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByRole("button", { name: /^Vibe/ }));
  await user.selectOptions(screen.getByLabelText("Interface colors"), label);
}

describe("interface colors", () => {
  it("follow the theme's mode by default", async () => {
    const user = userEvent.setup();
    render(<App />);
    const mode = app().dataset.mode;
    await user.click(screen.getByRole("button", { name: mode === "dark" ? "Light" : "Dark" }));
    expect(app().dataset.mode).not.toBe(mode);
  });

  it("can be pinned light or dark while the theme changes mode, and the choice is remembered", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await chooseChrome(user, "Always dark");
    expect(app().dataset.mode).toBe("dark");
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Light" }));
    expect(app().dataset.mode).toBe("dark"); // the theme is light now, the interface is not
    await user.click(screen.getByRole("button", { name: "Dark" }));
    expect(app().dataset.mode).toBe("dark");
    expect(localStorage.getItem("hueprint:chrome")).toBe("dark");
    unmount();

    render(<App />);
    expect(app().dataset.mode).toBe("dark"); // after a reload
    await chooseChrome(user, "Follow the theme");
    expect(localStorage.getItem("hueprint:chrome")).toBeNull();
  });

  it("fades for a moment after the colors change, then stops", async () => {
    const user = userEvent.setup();
    render(<App />);
    const mode = app().dataset.mode;
    await user.click(screen.getByRole("button", { name: mode === "dark" ? "Light" : "Dark" }));
    expect(app()).toHaveClass("chrome-swap");
    await act(() => new Promise((r) => setTimeout(r, 450)));
    expect(app()).not.toHaveClass("chrome-swap");
  });
});
