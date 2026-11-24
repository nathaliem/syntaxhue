import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../App";

async function openHexField(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /^Keyword/ }));
  return screen.getByRole("textbox", { name: "Hex color" }) as HTMLInputElement;
}

const keywordHex = () => screen.getByRole("button", { name: /^Keyword/ }).querySelector(".role-hex")!.textContent;

describe("hex field accepts any CSS color", () => {
  it("turns a typed rgb() into hex when you leave the field", async () => {
    const user = userEvent.setup();
    render(<App />);
    const input = await openHexField(user);
    await user.clear(input);
    await user.type(input, "rgb(255, 0, 128)");
    expect(keywordHex()).toBe("#ff0080"); // live preview once the function is closed
    await user.tab();
    expect(input).toHaveValue("#ff0080");
    expect(input).toHaveAttribute("aria-invalid", "false");
  });

  it("applies a pasted hsl() or oklch() right away", async () => {
    const user = userEvent.setup();
    render(<App />);
    const input = await openHexField(user);

    await user.click(input);
    await user.clear(input);
    await user.paste("hsl(120 100% 25%)");
    expect(keywordHex()).toBe("#008000");
    expect(input).toHaveValue("#008000");

    await user.clear(input);
    await user.paste("oklch(1 0 0)");
    expect(keywordHex()).toBe("#ffffff");
  });

  it("makes a paste one undo step", async () => {
    const user = userEvent.setup();
    render(<App />);
    const input = await openHexField(user);
    const before = keywordHex();
    await user.click(input);
    await user.clear(input);
    await user.paste("rgb(1 2 3)");
    expect(keywordHex()).toBe("#010203");
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(keywordHex()).toBe(before);
  });

  it("flags text it can't read and restores the color on blur", async () => {
    const user = userEvent.setup();
    render(<App />);
    const input = await openHexField(user);
    const before = keywordHex();
    await user.clear(input);
    await user.type(input, "rgb(1, 2)");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(keywordHex()).toBe(before);
    await user.tab();
    expect(input).toHaveValue(before);
  });

  it("still understands plain hex, including short forms", async () => {
    const user = userEvent.setup();
    render(<App />);
    const input = await openHexField(user);
    await user.clear(input);
    await user.type(input, "#abc");
    await user.tab();
    expect(keywordHex()).toBe("#aabbcc");
  });
});
