import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import * as analytics from "../analytics";

beforeEach(() => localStorage.removeItem("hueprint:survey"));
afterEach(() => vi.restoreAllMocks());

async function exportOnce(user: ReturnType<typeof userEvent.setup>) {
  vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
  render(<App />);
  await user.click(screen.getByRole("button", { name: "Export" }));
}

describe("exit survey after the first export", () => {
  it("is not shown before anything is exported", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Export" }));
    expect(screen.queryByText("How did exporting go?")).not.toBeInTheDocument();
  });

  it("appears after a copy, sends one fixed answer and is never asked again", async () => {
    const user = userEvent.setup();
    const track = vi.spyOn(analytics, "trackEvent");
    await exportOnce(user);
    await user.click(screen.getByRole("button", { name: "Copy snippet" }));
    expect(await screen.findByText("How did exporting go?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Needed some help" }));
    expect(track).toHaveBeenCalledWith("survey", { answer: "help" });
    expect(screen.queryByText("How did exporting go?")).not.toBeInTheDocument();
    expect(localStorage.getItem("hueprint:survey")).toBe("done");
  });

  it("'No thanks' sends nothing and still stops the question", async () => {
    const user = userEvent.setup();
    const track = vi.spyOn(analytics, "trackEvent");
    await exportOnce(user);
    await user.click(screen.getByRole("button", { name: "Copy snippet" }));
    await user.click(await screen.findByRole("button", { name: "No thanks" }));
    expect(track).not.toHaveBeenCalledWith("survey", expect.anything());
    expect(localStorage.getItem("hueprint:survey")).toBe("done");
  });

  it("stays away once answered", async () => {
    localStorage.setItem("hueprint:survey", "done");
    const user = userEvent.setup();
    await exportOnce(user);
    await user.click(screen.getByRole("button", { name: "Copy snippet" }));
    expect(screen.queryByText("How did exporting go?")).not.toBeInTheDocument();
  });
});
