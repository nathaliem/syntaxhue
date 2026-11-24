import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CrashScreen, ErrorBoundary } from "./ErrorBoundary";

describe("ErrorBoundary", () => {
  it("captures the error so the fallback renders", () => {
    const err = new Error("boom");
    expect(ErrorBoundary.getDerivedStateFromError(err)).toEqual({ error: err });
  });

  it("renders its children while nothing has failed", () => {
    const html = renderToStaticMarkup(
      <ErrorBoundary>
        <p>all good</p>
      </ErrorBoundary>,
    );
    expect(html).toBe("<p>all good</p>");
  });

  it("crash screen offers both recovery actions and shows the message", () => {
    const html = renderToStaticMarkup(<CrashScreen message="boom" onReload={() => {}} onFresh={() => {}} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain("Reload with last saved theme");
    expect(html).toContain("Start with a new theme");
    expect(html).toContain("boom");
  });
});

describe("ErrorBoundary in a real tree", () => {
  function Bomb(): never {
    throw new Error("render exploded");
  }

  it("shows the crash screen when a child throws, and Start with a new theme clears the saved theme", async () => {
    // React logs caught render errors; keep the test output clean.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem("hueprint:current", "{}");
    const reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload });

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("render exploded");

    await userEvent.click(screen.getByRole("button", { name: "Reload with last saved theme" }));
    expect(reload).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("hueprint:current")).toBe("{}");

    await userEvent.click(screen.getByRole("button", { name: "Start with a new theme" }));
    expect(localStorage.getItem("hueprint:current")).toBeNull();
    expect(reload).toHaveBeenCalledTimes(2);

    vi.unstubAllGlobals();
    spy.mockRestore();
  });
});
