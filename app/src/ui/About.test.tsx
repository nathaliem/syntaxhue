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
    expect(dialog).toHaveTextContent(/never your colors, theme names/);
    expect(dialog).toHaveTextContent(/Do Not Track/);
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect((dialog as HTMLDialogElement).open).toBe(false);
  });
});

describe("GitHub link", () => {
  it("is on the page, in About, and feedback goes to its issues", async () => {
    render(<App />);
    const links = screen.getAllByRole("link", { name: "Source on GitHub" });
    expect(links[0]).toHaveAttribute("href", "https://github.com/nathaliem/syntaxhue");
    const { FEEDBACK_URL } = await import("../feedback");
    expect(FEEDBACK_URL).toBe("https://github.com/nathaliem/syntaxhue/issues/new");
  });
});
