import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App";

afterEach(() => vi.restoreAllMocks());

/** user-event installs its own clipboard on setup(), so the spy goes on after it. */
function copyWith(result: "ok" | "fail" = "ok") {
  const spy = vi.spyOn(navigator.clipboard, "writeText");
  if (result === "fail") spy.mockRejectedValue(new Error("denied"));
  return spy;
}

async function openSettings(user: ReturnType<typeof userEvent.setup>) {
  render(<App />);
  await user.click(screen.getByRole("button", { name: "Export" }));
}

describe("Export > Settings: guide after copying", () => {
  it("shows the plain steps first and no troubleshooting", async () => {
    const user = userEvent.setup();
    await openSettings(user);
    expect(screen.getByText(/open the Command Palette/i)).toBeInTheDocument();
    expect(screen.queryByText("Colors didn't change?")).not.toBeInTheDocument();
  });

  it("after a copy, replaces the steps with the 3-step guide and the troubleshooting note", async () => {
    const user = userEvent.setup();
    const writeText = copyWith();
    await openSettings(user);
    await user.click(screen.getByRole("button", { name: "Copy snippet" }));
    expect(writeText).toHaveBeenCalledOnce();
    const note = await screen.findByRole("note");
    expect(note).toHaveTextContent("Colors didn't change?");
    expect(note).toHaveTextContent(/workbench\.colorCustomizations/);
    expect(note).toHaveTextContent(/Default (Dark|Light) Modern/);
    expect(screen.getByText(/Preferences: Open User Settings \(JSON\)/, { selector: "b" })).toBeInTheDocument();
    expect(screen.getByText("3.", { selector: "b" })).toBeInTheDocument();
  });

  it("stays on the plain steps when the copy fails", async () => {
    const user = userEvent.setup();
    copyWith("fail");
    await openSettings(user);
    await user.click(screen.getByRole("button", { name: "Copy snippet" }));
    expect(await screen.findByText(/Couldn't copy/)).toBeInTheDocument();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });
});
