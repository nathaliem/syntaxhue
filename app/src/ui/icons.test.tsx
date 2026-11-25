import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ICONS } from "./icons";

describe("icons", () => {
  it("has the fourteen icons of the set", () => {
    expect(Object.keys(ICONS).sort()).toEqual(
      [
        "check",
        "close",
        "copy",
        "export",
        "eyedropper",
        "library",
        "lock",
        "more",
        "redo",
        "shuffle",
        "undo",
        "unlock",
        "vibe",
        "warning",
      ].sort(),
    );
  });

  it.each(Object.entries(ICONS))("%s is a decorative 24 px grid svg in currentColor", (name, Icon) => {
    const { container } = render(<Icon />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("stroke", "currentColor");
    expect(svg).toHaveAttribute("stroke-width", "1.6");
    expect(svg).toHaveAttribute("stroke-linecap", "round");
    expect(svg).toHaveAttribute("stroke-linejoin", "round");
    expect(svg).toHaveAttribute("data-icon", name);
    expect(svg.children.length).toBeGreaterThan(0);
  });

  it("scales with size", () => {
    const { container } = render(<ICONS.lock size={32} />);
    expect(container.querySelector("svg")).toHaveAttribute("width", "32");
  });
});
