import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

// Tests that opt into the Node environment (`// @vitest-environment node`) have no browser to set up.
const dom = typeof window !== "undefined";

// Every test starts with empty browser storage and an empty URL hash.
if (dom)
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("hueprint:coach", "done"); // first-run tips are tested on their own
    history.replaceState(null, "", "/");
  });

if (dom)
  afterEach(() => {
    cleanup();
  });

// jsdom has no <dialog> methods; the export dialog calls them.
if (dom) {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false;
  };
}

// jsdom has no matchMedia. Tests run at a desktop width unless they change it. Only width queries are understood
// ("(min-width: 768px) and (max-width: 1199px)"); anything else (prefers-color-scheme) does not match.
const DESKTOP = 1440;
let width = DESKTOP;
const listeners = new Set<() => void>();
export function setViewportWidth(value: number) {
  width = value;
  listeners.forEach((l) => l());
}
export function setMobile(value: boolean) {
  setViewportWidth(value ? 390 : DESKTOP);
}
if (dom) beforeEach(() => setViewportWidth(DESKTOP));
function matchesWidth(query: string): boolean {
  const parts = query.split(/\s+and\s+/);
  return parts.every((p) => {
    const m = p.trim().match(/^\((min|max)-width:\s*(\d+)px\)$/);
    if (!m) return false;
    return m[1] === "min" ? width >= Number(m[2]) : width <= Number(m[2]);
  });
}
if (dom)
  window.matchMedia ??= ((query: string) => ({
    get matches() {
      return matchesWidth(query);
    },
    media: query,
    addEventListener: (_: string, l: () => void) => listeners.add(l),
    removeEventListener: (_: string, l: () => void) => listeners.delete(l),
  })) as unknown as typeof window.matchMedia;

// jsdom has no scrollIntoView; the app scrolls an opened editor into view.
if (dom) Element.prototype.scrollIntoView ??= () => {};
