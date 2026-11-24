import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { unzipStore } from "../engine/zip";

let blobs: Blob[] = [];
let downloads: string[] = [];

beforeEach(() => {
  blobs = [];
  downloads = [];
  URL.createObjectURL = vi.fn((b: Blob) => (blobs.push(b), "blob:x"));
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push(this.download);
  });
});
afterEach(() => vi.restoreAllMocks());

async function openTab(user: ReturnType<typeof userEvent.setup>) {
  render(<App />);
  await user.click(screen.getByRole("button", { name: "Export" }));
  await user.click(screen.getByRole("tab", { name: "Extension (.vsix)" }));
}
const readBlob = (b: Blob) =>
  new Promise<Uint8Array>((res) => {
    const r = new FileReader();
    r.onload = () => res(new Uint8Array(r.result as ArrayBuffer));
    r.readAsArrayBuffer(b);
  });

describe("Export > Extension (.vsix)", () => {
  it("won't download until there is a valid publisher id, and says why", async () => {
    const user = userEvent.setup();
    await openTab(user);
    const button = screen.getByRole("button", { name: /^Download .*\.vsix$/ });
    expect(button).toBeDisabled();
    expect(screen.getByText(/Enter your Marketplace publisher id/)).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Publisher id" }), "Not Valid");
    expect(button).toBeDisabled();
    expect(document.getElementById("ext-problems")).toHaveTextContent(/publisher id may only use/);
  });

  it("downloads a zip with the theme in it, named after the extension, and remembers the publisher", async () => {
    const user = userEvent.setup();
    await openTab(user);
    await user.type(screen.getByRole("textbox", { name: "Publisher id" }), "someone");
    const button = screen.getByRole("button", { name: /^Download .*\.vsix$/ });
    expect(button).toBeEnabled();
    await user.click(button);
    expect(downloads).toHaveLength(1);
    expect(downloads[0]).toMatch(/^[a-z0-9-]+-1\.0\.0\.vsix$/);
    const files = unzipStore(await readBlob(blobs[0]));
    expect(Object.keys(files)).toContain("extension.vsixmanifest");
    expect(JSON.parse(new TextDecoder().decode(files["extension/package.json"])).publisher).toBe("someone");
    expect(localStorage.getItem("hueprint.publisher")).toBe("someone");
  });

  it("starts with the remembered publisher", async () => {
    localStorage.setItem("hueprint.publisher", "saved-one");
    const user = userEvent.setup();
    await openTab(user);
    expect(screen.getByRole("textbox", { name: "Publisher id" })).toHaveValue("saved-one");
  });

  it("flags a bad version", async () => {
    const user = userEvent.setup();
    await openTab(user);
    await user.type(screen.getByRole("textbox", { name: "Publisher id" }), "someone");
    const v = screen.getByRole("textbox", { name: "Version" });
    await user.clear(v);
    await user.type(v, "1.0");
    expect(v).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: /^Download/ })).toBeDisabled();
  });
});
