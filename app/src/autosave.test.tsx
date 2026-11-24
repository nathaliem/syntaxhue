import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { encodeTheme } from "./engine/share";
import { generate } from "./engine/theme";

const KEY = "hueprint:current";
const stored = () => JSON.parse(localStorage.getItem(KEY) ?? "null") as { name: string } | null;
const nameInput = () => screen.getByLabelText("Theme name") as HTMLInputElement;
const rename = (name: string) => fireEvent.change(nameInput(), { target: { value: name } });
const wait = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("autosave", () => {
  it("writes an edit after a short pause, not on every keystroke", () => {
    render(<App />);
    wait(300); // the starting theme is stored too
    rename("First");
    wait(249);
    expect(stored()?.name).not.toBe("First");
    wait(2);
    expect(stored()?.name).toBe("First");
  });

  it("writes at once when the page is closed, so a last edit isn't lost", () => {
    render(<App />);
    wait(300);
    rename("Closed quickly");
    expect(stored()?.name).not.toBe("Closed quickly");
    act(() => void window.dispatchEvent(new Event("pagehide")));
    expect(stored()?.name).toBe("Closed quickly");
  });

  it("writes at once when the tab is hidden (phones often never fire pagehide)", () => {
    render(<App />);
    wait(300);
    rename("Backgrounded");
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    act(() => void document.dispatchEvent(new Event("visibilitychange")));
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    expect(stored()?.name).toBe("Backgrounded");
  });

  it("brings the theme back on the next visit", () => {
    const first = render(<App />);
    rename("Still here");
    act(() => void window.dispatchEvent(new Event("pagehide")));
    first.unmount();
    render(<App />);
    expect(nameInput().value).toBe("Still here");
  });

  it("says so when the browser refuses the write, and recovers when it works again", () => {
    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    render(<App />);
    wait(300);
    const state = () => document.querySelector(".save-state")!;
    expect(state()).toHaveTextContent("Not saved");
    expect(state()).toHaveAttribute("title", expect.stringMatching(/Share link/));
    rename("Still editable");
    wait(300);
    expect(nameInput().value).toBe("Still editable");
    expect(state()).toHaveTextContent("Not saved");

    set.mockRestore();
    rename("Works again");
    wait(300);
    expect(state()).toHaveTextContent("Saved");
    expect(stored()?.name).toBe("Works again");
  });

  it("shows Saved after a normal write", () => {
    render(<App />);
    rename("Fine");
    wait(300);
    expect(document.querySelector(".save-state")).toHaveTextContent("Saved");
  });

  it("doesn't replace your own saved theme with a shared one that was only opened", () => {
    const mine = { ...generate(3, "dark"), name: "Mine" };
    localStorage.setItem(KEY, JSON.stringify(mine));
    history.replaceState(null, "", "/#t=" + encodeTheme({ ...generate(9, "light"), name: "Shared" }));
    render(<App />);
    expect(nameInput().value).toBe("Shared");
    wait(300);
    act(() => void window.dispatchEvent(new Event("pagehide")));
    expect(stored()?.name).toBe("Mine");
  });
});
