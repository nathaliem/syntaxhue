import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

// Every test starts with empty browser storage and an empty URL hash.
beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/");
});

afterEach(() => {
  cleanup();
});

// jsdom has no <dialog> methods; the export dialog calls them.
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.open = true;
};
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.open = false;
};

// jsdom has no matchMedia. Tests are "desktop" unless they call setMobile(true).
let mobile = false;
const listeners = new Set<() => void>();
export function setMobile(value: boolean) {
  mobile = value;
  listeners.forEach((l) => l());
}
beforeEach(() => setMobile(false));
window.matchMedia ??= ((query: string) => ({
  get matches() {
    return query.includes("max-width: 767px") ? mobile : false;
  },
  media: query,
  addEventListener: (_: string, l: () => void) => listeners.add(l),
  removeEventListener: (_: string, l: () => void) => listeners.delete(l),
})) as unknown as typeof window.matchMedia;
