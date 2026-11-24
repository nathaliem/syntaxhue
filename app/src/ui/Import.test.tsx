import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../App";

const raw = import.meta.glob("../engine/__fixtures__/themes/*.json", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const fixtureFile = (n: string) =>
  new File([raw[`../engine/__fixtures__/themes/${n}.json`]], `${n}.json`, { type: "application/json" });

const drawer = () => screen.getByRole("dialog", { name: "Your themes" });
const nameInput = () => screen.getByLabelText("Theme name") as HTMLInputElement;

async function openImport(user: ReturnType<typeof userEvent.setup>) {
  render(<App />);
  await user.click(screen.getByRole("button", { name: "Library" }));
  return within(drawer());
}

describe("Import an existing theme", () => {
  it("imports Dark+ with its base file and makes it the current theme", async () => {
    const user = userEvent.setup();
    const d = await openImport(user);
    fireEvent.change(d.getByLabelText(/Choose a theme file/), {
      target: { files: [fixtureFile("dark_plus"), fixtureFile("dark_vs")] },
    });
    expect(await d.findByText(/Imported “Dark\+ \(imported\)”/)).toBeInTheDocument();
    expect(nameInput().value).toBe("Dark+ (imported)");
    expect(d.getByText(/SyntaxHue maps a theme onto its 15 colors/)).toBeInTheDocument();
    // one undo step brings back the theme that was open before
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(nameInput().value).not.toBe("Dark+ (imported)");
  });

  it("shows what was wrong with a file that isn't a theme", async () => {
    const user = userEvent.setup();
    const d = await openImport(user);
    fireEvent.change(d.getByLabelText(/Choose a theme file/), {
      target: { files: [new File(["{ nope"], "broken.json", { type: "application/json" })] },
    });
    expect(await d.findByRole("alert")).toHaveTextContent(/broken\.json isn't valid JSON/);
    expect(nameInput().value).not.toMatch(/imported/);
  });

  it("imports pasted JSON, and Fix contrast clears the readability warning in one step", async () => {
    const user = userEvent.setup();
    const d = await openImport(user);
    await user.click(d.getByText("Paste JSON instead"));
    const json = JSON.stringify({
      name: "Murky",
      colors: { "editor.background": "#101010", "editor.foreground": "#eeeeee" },
      tokenColors: [{ scope: "keyword", settings: { foreground: "#141414" } }],
    });
    // user.type would treat braces as key syntax, so set the value directly.
    fireEvent.change(d.getByLabelText("Theme JSON"), { target: { value: json } });
    await user.click(d.getByRole("button", { name: "Import pasted theme" }));
    expect(await d.findByText(/below the readable minimum/)).toBeInTheDocument();
    await user.click(d.getByRole("button", { name: "Fix contrast" }));
    await waitFor(() => expect(d.queryByText(/below the readable minimum/)).not.toBeInTheDocument());
    expect(nameInput().value).toBe("Murky (imported)");
  });
});
