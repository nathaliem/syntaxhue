import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FitToWidth } from "./FitToWidth";
import { LOGICAL_WIDTH, fitScale } from "./fitScale";

describe("fitScale", () => {
  it("shrinks to the available width and never enlarges", () => {
    expect(fitScale(LOGICAL_WIDTH / 2)).toBe(0.5);
    expect(fitScale(LOGICAL_WIDTH)).toBe(1);
    expect(fitScale(LOGICAL_WIDTH * 2)).toBe(1);
  });
  it("ignores unmeasured widths", () => {
    expect(fitScale(0)).toBe(1);
    expect(fitScale(NaN)).toBe(1);
  });
});

describe("FitToWidth", () => {
  it("scales the content down in a narrow container", () => {
    let notify: () => void = () => {};
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(cb: () => void) {
          notify = cb;
        }
        observe() {}
        disconnect() {}
      },
    );
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(550);
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(600);
    try {
      const { container } = render(
        <FitToWidth>
          <p>preview</p>
        </FitToWidth>,
      );
      notify();
      const outer = container.firstElementChild as HTMLElement;
      expect(outer).toHaveAttribute("data-scale", "0.5");
      expect(outer.style.height).toBe("300px");
      expect(screen.getByText("preview").parentElement).toHaveStyle({ transform: "scale(0.5)" });
    } finally {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    }
  });
});
