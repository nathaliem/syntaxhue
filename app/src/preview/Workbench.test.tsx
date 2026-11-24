import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../App";
import { workbenchColors } from "../engine/derive";
import { generate } from "../engine/theme";
import { SAMPLES } from "./samples";

const editor = () => document.querySelector(".wb-editor")!;

describe("indent guides", () => {
  it("draw one guide per indent level, and highlight the block around the cursor", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Python" }));
    const py = SAMPLES.find((s) => s.lang === "python")!;
    const lines = [...editor().querySelectorAll(".wb-ln")];
    expect(lines).toHaveLength(py.code.split("\n").length);
    // `    hue = ...` inside shuffle(): one level of four spaces
    const body = lines[py.cursor - 1];
    expect(body.querySelectorAll(".wb-guide")).toHaveLength(1);
    expect(body.querySelector(".wb-guide")).toHaveStyle({ left: "0ch" });
    expect(lines[0].querySelectorAll(".wb-guide")).toHaveLength(0);
    // the cursor's block is highlighted over the whole function body, not on unindented lines
    const activeLines = lines.filter((l) => l.querySelector(".wb-guide[data-active]"));
    expect(activeLines.length).toBeGreaterThan(2);
    expect(activeLines).toContain(body);
    expect(lines[0].querySelector("[data-active]")).toBeNull();
  });

  it("uses a tab as one level in Go", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Go" }));
    const go = SAMPLES.find((s) => s.lang === "go")!;
    const returnLine = [...editor().querySelectorAll(".wb-ln")][go.error - 1]; // two tabs deep
    expect([...returnLine.querySelectorAll<HTMLElement>(".wb-guide")].map((g) => g.style.left)).toEqual(["0ch", "2ch"]);
  });

  it("take their colors from the same keys the export writes", () => {
    const keys = workbenchColors(generate(3, "dark"));
    expect(keys["editorIndentGuide.background1"]).toBeTruthy();
    expect(keys["editorIndentGuide.activeBackground1"]).toBeTruthy();
    expect(keys["minimapSlider.background"]).toBeTruthy();
  });
});

describe("minimap", () => {
  it("has a row per line, in the colors of that line's tokens, and is hidden from screen readers", async () => {
    render(<App />);
    const map = document.querySelector(".wb-minimap")!;
    expect(map).toHaveAttribute("aria-hidden", "true");
    const rows = map.querySelectorAll(".wb-minimap-row");
    expect(rows).toHaveLength(SAMPLES[0].code.split("\n").length);
    await waitFor(() => expect(editor()).not.toHaveAttribute("data-loading"));
    const roles = new Set([...map.querySelectorAll("[data-role]")].map((e) => e.getAttribute("data-role")));
    expect(roles.has("keyword")).toBe(true);
    expect(roles.has("string")).toBe(true);
  });

  it("follows the language", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Go" }));
    expect(document.querySelectorAll(".wb-minimap-row")).toHaveLength(
      SAMPLES.find((s) => s.lang === "go")!.code.split("\n").length,
    );
  });
});
