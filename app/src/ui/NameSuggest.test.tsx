import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../App";

describe("suggested names", () => {
  it("lists names, applies the one you pick, and 'More names' gives different ones", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Suggest names" }));
    const items = () => screen.getAllByRole("button").filter((b) => b.classList.contains("menu-item"));
    const first = items().map((b) => b.textContent);
    expect(first.length).toBe(7); // six names and "More names"
    await user.click(screen.getByRole("button", { name: "More names" }));
    const second = items().map((b) => b.textContent);
    expect(second).not.toEqual(first);
    await user.click(items()[0]);
    expect((screen.getByLabelText("Theme name") as HTMLInputElement).value).toBe(second[0]);
  });
});
