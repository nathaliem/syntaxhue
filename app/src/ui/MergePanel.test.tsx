import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "../App";

describe("Export > merge your settings.json", () => {
  it("merges a pasted file, keeps the user's keys and copies the result", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByText(/Already have a settings\.json/));
    const box = screen.getByLabelText("Your settings.json");
    fireEvent.change(box, { target: { value: '{\n  // mine\n  "editor.fontSize": 14\n}' } });
    const out = screen.getByLabelText("Merged settings.json");
    expect(out).toHaveTextContent("// mine");
    expect(out).toHaveTextContent('"editor.fontSize": 14');
    expect(out).toHaveTextContent('"workbench.colorCustomizations"');
    await user.click(screen.getByRole("button", { name: "Copy merged settings" }));
    expect(writeText).toHaveBeenCalledOnce();
    expect(String(writeText.mock.calls[0][0])).toContain("// mine");
  });

  it("explains a broken file instead of producing output", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByText(/Already have a settings\.json/));
    fireEvent.change(screen.getByLabelText("Your settings.json"), { target: { value: '{ "a": ' } });
    expect(screen.getByRole("alert")).toHaveTextContent(/settings\.json/);
    expect(screen.queryByLabelText("Merged settings.json")).not.toBeInTheDocument();
  });
});
