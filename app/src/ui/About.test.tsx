import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../App";

describe("About and privacy", () => {
  it("opens from the rail and says what is collected and that it isn't a Microsoft product", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "About and privacy" }));
    const dialog = screen.getByRole("dialog", { name: "About and privacy" });
    expect(dialog).toHaveTextContent(/Not affiliated with Microsoft/);
    expect(dialog).toHaveTextContent(/never your colors or theme names/);
    expect(dialog).toHaveTextContent(/Do Not Track/);
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect((dialog as HTMLDialogElement).open).toBe(false);
  });
});
