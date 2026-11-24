import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
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
