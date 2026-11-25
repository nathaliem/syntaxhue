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
    await user.click(within(drawer()).getByRole("button", { name: "Save current" }));
    await within(drawer()).findByRole("list", { name: "Saved themes" });
    await user.click(await within(drawer()).findByRole("button", { name: "Save as new" }));
    await waitFor(() => expect(within(drawer()).getAllByRole("listitem")).toHaveLength(1));
  });

  it("shows unsaved changes against the library copy, and Update overwrites that copy", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.clear(nameInput());
    await user.type(nameInput(), "Original");
    await openLibrary(user);
    await user.click(within(drawer()).getByRole("button", { name: "Save current" }));
    const update = await within(drawer()).findByRole("button", { name: "Update “Original”" });
    expect(update).toBeDisabled();
    await user.keyboard("{Escape}");
    expect(screen.getByText("In library")).toBeInTheDocument();

    await user.clear(nameInput());
    await user.type(nameInput(), "Renamed");
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();

    await openLibrary(user);
    await user.click(await within(drawer()).findByRole("button", { name: "Update “Original”" }));
    await within(drawer()).findByRole("button", { name: "Open Renamed" });
    expect(within(drawer()).getAllByRole("listitem")).toHaveLength(1);
    await user.keyboard("{Escape}");
    expect(screen.getByText("In library")).toBeInTheDocument();
  });

  it("Save as new keeps the original and makes the copy the one being edited", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.clear(nameInput());
    await user.type(nameInput(), "Base");
    await openLibrary(user);
    await user.click(within(drawer()).getByRole("button", { name: "Save current" }));
    await within(drawer()).findByRole("button", { name: "Open Base" });
    await user.keyboard("{Escape}");
    await user.clear(nameInput());
    await user.type(nameInput(), "Variant");
    await openLibrary(user);
    await user.click(await within(drawer()).findByRole("button", { name: "Save as new" }));
    await within(drawer()).findByRole("button", { name: "Open Variant" });
    expect(within(drawer()).getByRole("button", { name: "Open Base" })).toBeInTheDocument();
    expect(within(drawer()).getByRole("button", { name: "Update “Variant”" })).toBeInTheDocument();
  });

  it("remembers which library theme you were editing after a reload", async () => {
    const user = userEvent.setup();
    const first = render(<App />);
    await user.clear(nameInput());
    await user.type(nameInput(), "Reloaded");
    await openLibrary(user);
    await user.click(within(drawer()).getByRole("button", { name: "Save current" }));
    await within(drawer()).findByRole("button", { name: "Open Reloaded" });
    window.dispatchEvent(new Event("pagehide")); // flush the autosave, as closing the tab does
    first.unmount();
    cleanup();

    render(<App />);
    expect(await screen.findByText("In library")).toBeInTheDocument();
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

describe("Library management", () => {
  const saveAs = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
    await user.clear(nameInput());
    await user.type(nameInput(), name);
    await openLibrary(user);
    await user.click(within(drawer()).getByRole("button", { name: /Save current|Save as new/ }));
    await within(drawer()).findByRole("button", { name: `Open ${name}` });
  };

  it("renames a saved theme and keeps the editor in step when it is the linked one", async () => {
    const user = userEvent.setup();
    render(<App />);
    await saveAs(user, "Old name");
    await user.click(within(drawer()).getByRole("button", { name: "Rename Old name" }));
    const input = within(drawer()).getByLabelText("New name for Old name");
    await user.clear(input);
    await user.type(input, "New name{Enter}");
    await within(drawer()).findByRole("button", { name: "Open New name" });
    expect(within(drawer()).getAllByRole("listitem")).toHaveLength(1);
    await user.keyboard("{Escape}");
    expect(nameInput().value).toBe("New name");
    expect(screen.getByText("In library")).toBeInTheDocument();
  });

  it("Escape cancels a rename without closing the drawer, and an empty name changes nothing", async () => {
    const user = userEvent.setup();
    render(<App />);
    await saveAs(user, "Keep me");
    await user.click(within(drawer()).getByRole("button", { name: "Rename Keep me" }));
    await user.type(within(drawer()).getByLabelText("New name for Keep me"), "xyz{Escape}");
    expect(within(drawer()).getByRole("button", { name: "Open Keep me" })).toBeInTheDocument();

    await user.click(within(drawer()).getByRole("button", { name: "Rename Keep me" }));
    await user.clear(within(drawer()).getByLabelText("New name for Keep me"));
    await user.keyboard("{Enter}");
    expect(await within(drawer()).findByRole("button", { name: "Open Keep me" })).toBeInTheDocument();
  });

  it("duplicates a theme without changing which one is being edited", async () => {
    const user = userEvent.setup();
    render(<App />);
    await saveAs(user, "Original");
    await user.click(within(drawer()).getByRole("button", { name: "Duplicate Original" }));
    await within(drawer()).findByRole("button", { name: "Open Original copy" });
    expect(within(drawer()).getAllByRole("listitem")).toHaveLength(2);
    expect(within(drawer()).getByRole("button", { name: "Update “Original”" })).toBeInTheDocument();
  });

  it("deletes without a confirm dialog, and Undo in the toast puts the theme back", async () => {
    const user = userEvent.setup();
    render(<App />);
    await saveAs(user, "Doomed");
    await user.click(within(drawer()).getByRole("button", { name: "Delete Doomed" }));
    expect(await within(drawer()).findByText(/No saved themes yet/)).toBeInTheDocument();
    const toast = screen.getByRole("status", { name: "Notification" });
    expect(toast).toHaveTextContent("Deleted “Doomed”.");

    await user.click(within(toast).getByRole("button", { name: "Undo" }));
    expect(await within(drawer()).findByRole("button", { name: "Open Doomed" })).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Notification" })).not.toBeInTheDocument();
    // It is the linked entry again, so Update is offered.
    expect(within(drawer()).getByRole("button", { name: "Update “Doomed”" })).toBeInTheDocument();
  });

  it("the undo toast outlives the drawer", async () => {
    const user = userEvent.setup();
    render(<App />);
    await saveAs(user, "Still undoable");
    await user.click(within(drawer()).getByRole("button", { name: "Delete Still undoable" }));
    await within(drawer()).findByText(/No saved themes yet/);
    await user.keyboard("{Escape}");
    await user.click(
      within(screen.getByRole("status", { name: "Notification" })).getByRole("button", { name: "Undo" }),
    );
    await openLibrary(user);
    expect(await within(drawer()).findByRole("button", { name: "Open Still undoable" })).toBeInTheDocument();
  });

  it("a delete stays deleted after the app is reopened", async () => {
    const user = userEvent.setup();
    const first = render(<App />);
    await saveAs(user, "Gone");
    await user.click(within(drawer()).getByRole("button", { name: "Delete Gone" }));
    await within(drawer()).findByText(/No saved themes yet/);
    first.unmount();
    cleanup();

    render(<App />);
    await openLibrary(user);
    expect(await within(drawer()).findByText(/No saved themes yet/)).toBeInTheDocument();
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
