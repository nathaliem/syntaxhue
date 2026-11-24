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
