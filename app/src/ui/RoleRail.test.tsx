import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
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

/**
 * What a browser does on Ctrl/⌘+C: fires a copy event on the focused element and lets the handler fill
 * the clipboard. (user-event's `copy()` skips the event when nothing is selected, unlike browsers.)
 */
async function copyFrom(el: HTMLElement) {
  const data: Record<string, string> = {};
  const clipboardData = {
    setData: (type: string, v: string) => void (data[type] = v),
    getData: (t: string) => data[t] ?? "",
  };
  fireEvent.copy(el, { clipboardData });
  await navigator.clipboard.writeText(data["text/plain"] ?? "");
  return data["text/plain"];
}

const copyKeys = "{Control>}c{/Control}";

describe("copy and paste a color between roles", () => {
  const row = (name: RegExp) => screen.getByRole("button", { name });
  const hexOf = (name: RegExp) => row(name).querySelector(".role-hex")!.textContent;
  const footer = () => document.querySelector(".side-foot[role=status]")!;

  it("Ctrl/⌘+C on a focused row copies its color, Ctrl/⌘+V on another row pastes it", async () => {
    const user = userEvent.setup();
    render(<App />);
    const from = hexOf(/^String/);
    const toBefore = hexOf(/^Number/);
    expect(from).not.toBe(toBefore);

    row(/^String/).focus();
    await user.keyboard(copyKeys);
    expect(await navigator.clipboard.readText()).toBe(from);
    expect(footer()).toHaveTextContent(`Copied ${from}`);

    row(/^Number/).focus();
    await user.paste();
    expect(hexOf(/^Number/)).toBe(from);
    expect(footer()).toHaveTextContent(`Pasted ${from} into Number`);
    expect(hexOf(/^String/)).toBe(from); // the source is untouched
  });

  it("pastes any CSS color from outside the app, not just hex", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Lock all" })); // paste must work on locked roles too
    await navigator.clipboard.writeText("rgb(255 0 128)");
    row(/^Keyword/).focus();
    await user.paste();
    expect(hexOf(/^Keyword/)).toBe("#ff0080");
  });

  it("a paste is one undo step", async () => {
    const user = userEvent.setup();
    render(<App />);
    const before = hexOf(/^Operator/);
    await navigator.clipboard.writeText("#102030");
    row(/^Operator/).focus();
    await user.paste();
    expect(hexOf(/^Operator/)).toBe("#102030");
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(hexOf(/^Operator/)).toBe(before);
  });

  it("tells you when the clipboard has no color, and changes nothing", async () => {
    const user = userEvent.setup();
    render(<App />);
    const before = hexOf(/^Function/);
    await navigator.clipboard.writeText("not a color");
    row(/^Function/).focus();
    await user.paste();
    expect(hexOf(/^Function/)).toBe(before);
    expect(footer()).toHaveTextContent("Couldn't read a color from the clipboard");
  });

  it("the message goes away again and the contrast summary comes back", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);
      row(/^String/).focus();
      await user.keyboard(copyKeys);
      expect(footer()).toHaveTextContent(/^Copied/);
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });
      expect(footer()).toHaveTextContent(/contrast|readable/);
    } finally {
      vi.useRealTimers();
    }
  });

  it("Cmd+C works too, and Shift or Alt combinations are left alone", async () => {
    const user = userEvent.setup();
    render(<App />);
    const hex = hexOf(/^Type\b/);
    row(/^Type\b/).focus();
    await user.keyboard("{Meta>}c{/Meta}");
    expect(await navigator.clipboard.readText()).toBe(hex);
    await navigator.clipboard.writeText("untouched");
    await user.keyboard("{Control>}{Shift>}c{/Shift}{/Control}");
    await user.keyboard("{Alt>}c{/Alt}");
    expect(await navigator.clipboard.readText()).toBe("untouched");
  });

  it("still handles a copy event (Edit > Copy)", async () => {
    render(<App />);
    const hex = hexOf(/^Type\b/);
    userEvent.setup();
    expect(await copyFrom(row(/^Type\b/))).toBe(hex);
    expect(footer()).toHaveTextContent(`Copied ${hex}`);
  });

  it("says so when the clipboard can't be written", async () => {
    const user = userEvent.setup();
    render(<App />);
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(new Error("denied"));
    row(/^Type\b/).focus();
    await user.keyboard(copyKeys);
    expect(footer()).toHaveTextContent("Couldn't copy to the clipboard");
  });

  it("the row advertises the shortcuts", () => {
    render(<App />);
    expect(row(/^String/)).toHaveAttribute("aria-keyshortcuts", expect.stringContaining("Control+C"));
    expect(row(/^String/)).toHaveAttribute("title", expect.stringContaining("Ctrl/⌘+V"));
  });
});

describe("keyboard focus on a color row", () => {
  it("highlights its elements in the preview, like hovering, and clears when focus leaves the row", async () => {
    const user = userEvent.setup();
    render(<App />);
    const preview = () => document.querySelector(".wb")!.getAttribute("data-hl");
    expect(preview()).toBeNull();
    act(() => screen.getByRole("button", { name: /^Keyword/ }).focus());
    expect(preview()).toBe("keyword");
    await user.tab(); // the row's lock button: still the same row
    expect(preview()).toBe("keyword");
    await user.tab(); // next row
    expect(preview()).toBe("string");
    act(() => screen.getByRole("button", { name: /^Shuffle/ }).focus());
    expect(preview()).toBeNull();
  });
});
