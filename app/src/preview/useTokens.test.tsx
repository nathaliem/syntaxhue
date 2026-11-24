import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useTokens } from "./useTokens";

describe("useTokens", () => {
  it("starts plain and loading, then returns Shiki's tokens", async () => {
    const { result } = renderHook(() => useTokens("const a = 1;", "typescript"));
    expect(result.current.loading).toBe(true);
    expect(result.current.lines[0].every((t) => t.role === null)).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.lines[0].some((t) => t.role === "keyword")).toBe(true);
  });

  it("goes back to loading when the language changes, until that grammar is in", async () => {
    const { result, rerender } = renderHook(({ lang }) => useTokens("x = 1", lang), {
      initialProps: { lang: "typescript" as const } as { lang: "typescript" | "python" },
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    rerender({ lang: "python" });
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});
