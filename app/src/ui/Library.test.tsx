import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../App";
import { ago } from "./ago";

const nameInput = () => screen.getByLabelText("Theme name") as HTMLInputElement;
const drawer = () => screen.getByRole("dialog", { name: "Your themes" });
const openLibrary = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: "Library" }));

beforeEach(() => {
  // A fresh database for every test, while the app still finds one at `indexedDB`.
  (globalThis as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
});

describe("Library drawer", () => {
  it("starts empty, saves the current theme, and opens it again later", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openLibrary(user);
    expect(await within(drawer()).findByText(/No saved themes yet/)).toBeInTheDocument();

    await user.clear(nameInput());
    await user.type(nameInput(), "Dusk Grove");
    await user.click(within(drawer()).getByRole("button", { name: "Save current" }));
    expect(await within(drawer()).findByRole("button", { name: "Open Dusk Grove" })).toBeInTheDocument();
    expect(within(drawer()).getByRole("status")).toHaveTextContent("Saved “Dusk Grove”.");

    // Change the theme, then open the saved one: the saved name and colors come back.
    await user.keyboard("{Escape}");
    await user.clear(nameInput());
    await user.type(nameInput(), "Something else");
    await openLibrary(user);
    await user.click(await within(drawer()).findByRole("button", { name: "Open Dusk Grove" }));
    expect(nameInput().value).toBe("Dusk Grove");
  });

  it("keeps saved themes after the app is closed and opened again", async () => {
    const user = userEvent.setup();
    const first = render(<App />);
    await user.clear(nameInput());
    await user.type(nameInput(), "Kept");
    await openLibrary(user);
    await user.click(within(drawer()).getByRole("button", { name: "Save current" }));
    await within(drawer()).findByRole("button", { name: "Open Kept" });
    first.unmount();
    cleanup();

    render(<App />);
    await openLibrary(user);
    expect(await within(drawer()).findByRole("button", { name: "Open Kept" })).toBeInTheDocument();
    expect(within(drawer()).queryByText(/isn't letting us store data/)).not.toBeInTheDocument();
  });

  it("saving the same colors twice keeps one entry", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openLibrary(user);
    const save = within(drawer()).getByRole("button", { name: "Save current" });
    await user.click(save);
    await within(drawer()).findByRole("list", { name: "Saved themes" });
    await user.click(save);
    await waitFor(() => expect(within(drawer()).getAllByRole("listitem")).toHaveLength(1));
  });

  it("saves with ⌘S and says so", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.keyboard("{Meta>}s{/Meta}");
    expect(await screen.findByText(/to your library\./)).toBeInTheDocument();
    await openLibrary(user);
    expect(await within(drawer()).findAllByRole("listitem")).toHaveLength(1);
  });

  it("tells you when the browser blocks storage, and still lets you save for this visit", async () => {
    (globalThis as { indexedDB: unknown }).indexedDB = undefined;
    const user = userEvent.setup();
    render(<App />);
    await openLibrary(user);
    expect(await within(drawer()).findByRole("note")).toHaveTextContent(
      /themes will disappear when you close this tab/,
    );
    await user.click(within(drawer()).getByRole("button", { name: "Save current" }));
    expect(await within(drawer()).findAllByRole("listitem")).toHaveLength(1);
  });

  it("doesn't shuffle while the drawer is open", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openLibrary(user);
    const before = nameInput().value;
    await user.keyboard(" ");
    expect(nameInput().value).toBe(before);
  });
});

describe("ago", () => {
  it("reads naturally", () => {
    const now = 10_000_000_000;
    expect(ago(now - 20_000, now)).toBe("just now");
    expect(ago(now - 5 * 60_000, now)).toBe("5 min ago");
    expect(ago(now - 2 * 3_600_000, now)).toBe("2 h ago");
    expect(ago(now - 3 * 86_400_000, now)).toBe("3 d ago");
  });
});
