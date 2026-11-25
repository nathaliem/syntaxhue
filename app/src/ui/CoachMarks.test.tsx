import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../App";
import { setViewportWidth } from "../test/setup";
import { COACH_KEY } from "./CoachMarks";

const first = () => {
  localStorage.removeItem(COACH_KEY);
};

describe("first-run coach marks", () => {
  it("shows three tips in turn and then stays away", async () => {
    first();
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    expect(screen.getByRole("note", { name: /Tip 1 of 3/ })).toHaveTextContent("Shuffle");
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("note", { name: /Tip 2 of 3/ })).toHaveTextContent("Click anything");
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("note", { name: /Tip 3 of 3/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Got it" }));
    expect(screen.queryByRole("note")).toBeNull();
    unmount();
    render(<App />);
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("Skip hides them for good", async () => {
    first();
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Skip" }));
    expect(screen.queryByRole("note")).toBeNull();
    expect(localStorage.getItem(COACH_KEY)).toBe("done");
  });

  it("never blocks the app: Shuffle still works while a tip is showing and focus isn't taken", async () => {
    first();
    const user = userEvent.setup();
    render(<App />);
    expect(document.activeElement).toBe(document.body);
    await user.click(screen.getByRole("button", { name: /^Shuffle/ }));
    expect(screen.getByRole("note")).toBeInTheDocument();
  });

  it("is not shown again once dismissed in an earlier visit", () => {
    render(<App />);
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("works on a phone, pointing at the thumb bar", () => {
    first();
    setViewportWidth(390);
    render(<App />);
    expect(screen.getByRole("note", { name: /Tip 1 of 3/ })).toBeInTheDocument();
    expect(document.querySelector('.thumb-bar [data-coach="shuffle"]')).not.toBeNull();
  });
});
