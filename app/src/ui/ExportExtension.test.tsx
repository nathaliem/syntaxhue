import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { decodePng } from "../engine/png";
import { unzipStore } from "../engine/zip";

vi.mock("../preview/screenshot", () => ({
  allScreenshots: vi.fn(async () => [
    { lang: "typescript", label: "TypeScript", png: new Uint8Array([9, 9]) },
    { lang: "python", label: "Python", png: new Uint8Array([8, 8]) },
  ]),
}));

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
const field = (name: string) => screen.getByRole("textbox", { name }) as HTMLInputElement;
const download = () => screen.getByRole("button", { name: /^Download .*\.vsix$/ });
const readBlob = (b: Blob) =>
  new Promise<Uint8Array>((res) => {
    const r = new FileReader();
    r.onload = () => res(new Uint8Array(r.result as ArrayBuffer));
    r.readAsArrayBuffer(b);
  });
const pkgOf = async () =>
  JSON.parse(new TextDecoder().decode(unzipStore(await readBlob(blobs[0]))["extension/package.json"]));

describe("Export > Extension (.vsix) form", () => {
  it("starts with suggestions from the theme and waits for a publisher id", async () => {
    const user = userEvent.setup();
    await openTab(user);
    const themeName = (screen.getByRole("textbox", { name: "Theme name" }) as HTMLInputElement).value;
    expect(field("Name")).toHaveValue(themeName);
    expect(field("Extension id").value).toMatch(/^[a-z0-9-]+$/);
    expect(field("Description").value).toContain(themeName);
    expect(download()).toBeDisabled();
    expect(field("Publisher id")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Enter your publisher id.")).toBeInTheDocument();
    expect(screen.getByText(/Fix the highlighted fields/)).toBeInTheDocument();
    expect(field("Name in the license")).toHaveAttribute("aria-invalid", "false"); // not reported twice
  });

  it("checks each field as you type and points the message at the field", async () => {
    const user = userEvent.setup();
    await openTab(user);
    await user.type(field("Publisher id"), "Not Valid");
    expect(field("Publisher id")).toHaveAttribute("aria-invalid", "true");
    const msg = document.getElementById(field("Publisher id").getAttribute("aria-describedby")!)!;
    expect(msg).toHaveTextContent(/lowercase letters, digits and hyphens/);

    await user.clear(field("Publisher id"));
    await user.type(field("Publisher id"), "someone");
    expect(field("Publisher id")).toHaveAttribute("aria-invalid", "false");
    expect(download()).toBeEnabled();

    await user.clear(field("Version"));
    await user.type(field("Version"), "1.0");
    expect(field("Version")).toHaveAttribute("aria-invalid", "true");
    expect(download()).toBeDisabled();
    await user.type(field("Version"), ".1");
    expect(download()).toBeEnabled();

    await user.type(field("Repository (optional)"), "github.com/a/b");
    expect(field("Repository (optional)")).toHaveAttribute("aria-invalid", "true");
    expect(download()).toBeDisabled();
  });

  it("keeps focus while typing (fields are not remounted)", async () => {
    const user = userEvent.setup();
    await openTab(user);
    await user.type(field("Publisher id"), "abc");
    expect(field("Publisher id")).toHaveFocus();
    expect(field("Publisher id")).toHaveValue("abc");
  });

  it("downloads a package built from every field, and remembers who you are", async () => {
    const user = userEvent.setup();
    await openTab(user);
    await user.type(field("Publisher id"), "someone");
    await user.clear(field("Name"));
    await user.type(field("Name"), "Meadow Dark");
    await user.clear(field("Extension id"));
    await user.type(field("Extension id"), "meadow-dark");
    await user.clear(field("Description"));
    await user.type(field("Description"), "Greens at night.");
    await user.type(field("Keywords (optional)"), "Green, calm, GREEN");
    await user.type(field("Repository (optional)"), "https://github.com/someone/meadow");
    await user.selectOptions(screen.getByRole("combobox", { name: "License" }), "ISC");
    await user.click(download());

    expect(downloads).toEqual(["meadow-dark-1.0.0.vsix"]);
    const pkg = await pkgOf();
    expect(pkg).toMatchObject({
      name: "meadow-dark",
      displayName: "Meadow Dark",
      publisher: "someone",
      description: "Greens at night.",
      license: "ISC",
      repository: { url: "https://github.com/someone/meadow" },
    });
    expect(pkg.keywords).toEqual(expect.arrayContaining(["green", "calm"]));
    expect(pkg.keywords.filter((k: string) => k === "green")).toHaveLength(1);
    const files = unzipStore(await readBlob(blobs[0]));
    expect(new TextDecoder().decode(files["extension/LICENSE.txt"])).toContain("ISC License");

    const remembered = JSON.parse(localStorage.getItem("hueprint.extension")!);
    expect(remembered).toMatchObject({
      publisher: "someone",
      license: "ISC",
      repository: "https://github.com/someone/meadow",
    });
    expect(remembered).not.toHaveProperty("displayName"); // what this theme is called is not remembered
  });

  it("starts with what was remembered, and ignores a damaged save", async () => {
    localStorage.setItem(
      "hueprint.extension",
      JSON.stringify({ publisher: "saved-one", license: "Unlicense", author: "A. B." }),
    );
    const user = userEvent.setup();
    await openTab(user);
    expect(field("Publisher id")).toHaveValue("saved-one");
    expect(field("Name in the license")).toHaveValue("A. B.");
    expect(screen.getByRole("combobox", { name: "License" })).toHaveValue("Unlicense");
  });

  it("falls back to defaults when the saved details are damaged", async () => {
    localStorage.setItem("hueprint.extension", "{not json");
    const user = userEvent.setup();
    await openTab(user);
    expect(field("Publisher id")).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "License" })).toHaveValue("MIT");
  });

  it("suggests a repository without blocking, and can go back to the suggestions", async () => {
    const user = userEvent.setup();
    await openTab(user);
    await user.type(field("Publisher id"), "someone");
    expect(screen.getByRole("list", { name: "Suggestions" })).toHaveTextContent(/No repository/);
    expect(download()).toBeEnabled();

    const suggestedId = field("Extension id").value;
    await user.clear(field("Extension id"));
    await user.type(field("Extension id"), "other");
    await user.click(screen.getByRole("button", { name: /Use suggested name/ }));
    expect(field("Extension id")).toHaveValue(suggestedId);
  });

  it("uses the publisher id for the license name when none is given", async () => {
    const user = userEvent.setup();
    await openTab(user);
    await user.type(field("Publisher id"), "someone");
    await user.click(download());
    const files = unzipStore(await readBlob(blobs[0]));
    expect(new TextDecoder().decode(files["extension/LICENSE.txt"])).toMatch(/Copyright \(c\) \d{4} someone/);
  });

  it("puts a 128 px icon of the palette in the package and shows it", async () => {
    const user = userEvent.setup();
    await openTab(user);
    expect(screen.getByRole("img", { name: "Icon preview" })).toHaveAttribute(
      "src",
      expect.stringMatching(/^data:image\/png;base64,/),
    );
    await user.type(field("Publisher id"), "someone");
    await user.click(download());
    const files = unzipStore(await readBlob(blobs[0]));
    expect(decodePng(files["extension/images/icon.png"])).toMatchObject({ width: 128, height: 128 });
    expect((await pkgOf()).icon).toBe("images/icon.png");
  });

  it("offers screenshots only with a GitHub or GitLab repository, and then adds them to the package and README", async () => {
    const user = userEvent.setup();
    await openTab(user);
    await user.type(field("Publisher id"), "someone");
    const box = screen.getByRole("checkbox", { name: /screenshot per language/ });
    expect(box).toBeDisabled();
    expect(screen.getByText(/Needs a GitHub or GitLab repository/)).toBeInTheDocument();

    await user.type(field("Repository (optional)"), "https://github.com/someone/meadow");
    expect(box).toBeEnabled();
    await user.click(box);
    await user.click(download());
    await waitFor(() => expect(downloads).toHaveLength(1));
    const files = unzipStore(await readBlob(blobs[0]));
    expect([...files["extension/images/screenshot-python.png"]]).toEqual([8, 8]);
    const readme = new TextDecoder().decode(files["extension/README.md"]);
    expect(readme).toContain("![Python](images/screenshot-python.png)");
  });

  it("says so when the package cannot be built, and stays usable", async () => {
    const { allScreenshots } = await import("../preview/screenshot");
    vi.mocked(allScreenshots).mockRejectedValueOnce(new Error("Canvas is not available in this browser"));
    const user = userEvent.setup();
    await openTab(user);
    await user.type(field("Publisher id"), "someone");
    await user.type(field("Repository (optional)"), "https://github.com/someone/meadow");
    await user.click(screen.getByRole("checkbox", { name: /screenshot per language/ }));
    await user.click(download());
    expect(await screen.findByRole("alert")).toHaveTextContent("Canvas is not available");
    expect(downloads).toHaveLength(0);
    expect(download()).toBeEnabled();
  });
});
