import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../App";
import { formatVibe, vibeValueText } from "./vibeLabels";

// Every role color at once. The theme is random, so a single role can sit where a slider changes nothing
// (a keyword that is already as warm as warmth pulls it); all of them together always move.
const keywordVar = () => {
  const el = document.querySelector('[style*="--r-keyword"]') as HTMLElement;
  return [...el.style]
    .filter((p) => p.startsWith("--r-"))
    .map((p) => `${p}:${el.style.getPropertyValue(p)}`)
    .join(";");
};
const sliderFor = (name: string) => screen.getByRole("slider", { name }) as HTMLInputElement;

async function openVibe(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /^Vibe/ }));
  return screen.getByRole("dialog", { name: "Vibe" });
}

/** What a drag does: live changes, then release. */
function drag(input: HTMLInputElement, values: number[]) {
  for (const v of values) fireEvent.change(input, { target: { value: String(v) } });
  fireEvent.pointerUp(input);
}

describe("vibe panel", () => {
  it("opens from the top bar with four labelled sliders, each centered at 0", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.queryByRole("dialog", { name: "Vibe" })).not.toBeInTheDocument();
    const pop = await openVibe(user);
    for (const name of ["Contrast", "Saturation", "Warmth", "Depth"]) {
      const s = within(pop).getByRole("slider", { name });
      expect(s).toHaveValue("0");
      expect(s).toHaveAttribute("min", "-1");
      expect(s).toHaveAttribute("max", "1");
    }
    for (const end of ["Soft", "Crisp", "Muted", "Vivid", "Cool", "Warm", "Flat", "Layered"]) {
      expect(within(pop).getByText(end)).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: /^Vibe/ })).toHaveAttribute("aria-expanded", "true");
  });

  it("closes on Esc and gives focus back to the button", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openVibe(user);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Vibe" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Vibe/ })).toHaveFocus();
  });

  it("closes on a click outside, but not on a click inside", async () => {
    const user = userEvent.setup();
    render(<App />);
    const pop = await openVibe(user);
    await user.click(within(pop).getByText(/Tweaks the whole theme/));
    expect(screen.getByRole("dialog", { name: "Vibe" })).toBeInTheDocument();
    await user.click(screen.getByRole("region", { name: "Preview" }));
    expect(screen.queryByRole("dialog", { name: "Vibe" })).not.toBeInTheDocument();
  });

  it("changes the preview live while you drag", async () => {
    const user = userEvent.setup();
    render(<App />);
    const before = keywordVar();
    await openVibe(user);
    fireEvent.change(sliderFor("Saturation"), { target: { value: "-1" } }); // mid-drag, not released
    expect(keywordVar()).not.toBe(before);
  });

  it("shows the value and a spoken description", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openVibe(user);
    expect(sliderFor("Contrast")).toHaveAttribute("aria-valuetext", "Off");
    drag(sliderFor("Contrast"), [0.35]);
    expect(sliderFor("Contrast")).toHaveAttribute("aria-valuetext", "35 percent toward Crisp");
    drag(sliderFor("Warmth"), [-0.2]);
    expect(sliderFor("Warmth")).toHaveAttribute("aria-valuetext", "20 percent toward Cool");
    expect(screen.getByText("+35")).toBeInTheDocument();
    expect(screen.getByText("-20")).toBeInTheDocument();
  });

  it("a whole drag is one undo step", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openVibe(user);
    drag(sliderFor("Warmth"), [0.1, 0.3, 0.6, 0.9]);
    expect(sliderFor("Warmth")).toHaveValue("0.9");
    await user.click(screen.getByRole("button", { name: "Undo" })); // an outside click, so the popover closes
    await openVibe(user);
    expect(sliderFor("Warmth")).toHaveValue("0");
    // The whole drag was one step, so there is nothing further to undo.
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
  });

  it("per-slider Reset puts that slider back to 0 and returns the exact original colors", async () => {
    const user = userEvent.setup();
    render(<App />);
    const before = keywordVar();
    await openVibe(user);
    expect(screen.getByRole("button", { name: "Reset Warmth" })).toBeDisabled();
    drag(sliderFor("Warmth"), [0.8]);
    drag(sliderFor("Depth"), [0.5]);
    expect(keywordVar()).not.toBe(before);
    await user.click(screen.getByRole("button", { name: "Reset Warmth" }));
    expect(sliderFor("Warmth")).toHaveValue("0");
    expect(sliderFor("Depth")).toHaveValue("0.5");
    expect(keywordVar()).toBe(before);
  });

  it("Reset all clears every slider", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openVibe(user);
    const resetAll = screen.getByRole("button", { name: "Reset all" });
    expect(resetAll).toBeDisabled();
    drag(sliderFor("Contrast"), [0.4]);
    drag(sliderFor("Saturation"), [-0.4]);
    expect(resetAll).toBeEnabled();
    await user.click(resetAll);
    for (const name of ["Contrast", "Saturation", "Warmth", "Depth"]) expect(sliderFor(name)).toHaveValue("0");
    expect(resetAll).toBeDisabled();
  });

  it("works from the keyboard: arrows nudge, Shift+arrow moves 10 times further", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openVibe(user);
    const depth = sliderFor("Depth");
    depth.focus();
    await user.keyboard("{Shift>}{ArrowRight}{/Shift}");
    expect(depth).toHaveValue("0.1");
    await user.keyboard("{Shift>}{ArrowRight}{ArrowRight}{/Shift}");
    expect(depth).toHaveValue("0.3");
    await user.keyboard("{Shift>}{ArrowLeft}{/Shift}");
    expect(depth).toHaveValue("0.2");
    await user.keyboard("{Shift>}{ArrowLeft}{ArrowLeft}{ArrowLeft}{/Shift}");
    expect(depth).toHaveValue("-0.1");
  });

  it("Shift+arrow stops at the ends", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openVibe(user);
    const s = sliderFor("Saturation");
    s.focus();
    for (let i = 0; i < 12; i++) await user.keyboard("{Shift>}{ArrowRight}{/Shift}");
    expect(s).toHaveValue("1");
  });

  it("marks the Vibe button when something is adjusted, and keeps vibe after a shuffle", async () => {
    const user = userEvent.setup();
    render(<App />);
    const button = () => screen.getByRole("button", { name: /^Vibe/ });
    expect(within(button()).queryByRole("img", { name: "adjusted" })).not.toBeInTheDocument();
    await openVibe(user);
    drag(sliderFor("Saturation"), [-0.5]);
    expect(within(button()).getByRole("img", { name: "adjusted" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Shuffle/ }));
    await openVibe(user);
    expect(sliderFor("Saturation")).toHaveValue("-0.5");
  });
});

describe("vibe labels", () => {
  it("formats values", () => {
    expect(formatVibe(0)).toBe("0");
    expect(formatVibe(0.35)).toBe("+35");
    expect(formatVibe(-1)).toBe("-100");
    expect(vibeValueText("depth", -0.5)).toBe("50 percent toward Flat");
  });
});
