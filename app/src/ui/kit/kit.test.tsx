import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  Badge,
  Button,
  Dialog,
  IconButton,
  Popover,
  SegmentedControl,
  Slider,
  TextField,
  ToastProvider,
  Toggle,
  useToast,
} from ".";

describe("Button", () => {
  it("is a plain button by default and maps variant, size and pressed to classes and aria", () => {
    const { rerender } = render(<Button>Copy snippet</Button>);
    const b = screen.getByRole("button", { name: "Copy snippet" });
    expect(b).toHaveAttribute("type", "button");
    expect(b).toHaveClass("btn");
    expect(b).not.toHaveAttribute("aria-pressed");

    rerender(
      <Button variant="primary" size="sm" pressed>
        Copy snippet
      </Button>,
    );
    expect(b).toHaveClass("primary", "sm", "on");
    expect(b).toHaveAttribute("aria-pressed", "true");

    rerender(<Button variant="ghost">Copy snippet</Button>);
    expect(b).toHaveClass("ghost");
  });

  it("does not fire when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("IconButton and Tooltip", () => {
  it("is named by its label and shows a tooltip with the shortcut on keyboard focus", async () => {
    const user = userEvent.setup();
    render(
      <IconButton label="Undo" shortcut="⌘Z">
        ↶
      </IconButton>,
    );
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    await user.tab();
    const tip = await screen.findByRole("tooltip");
    expect(tip).toHaveTextContent("Undo");
    expect(tip).toHaveTextContent("⌘Z");
    expect(screen.getByRole("button", { name: "Undo" })).toHaveAccessibleDescription("Undo ⌘Z");
  });

  it("Escape dismisses the tooltip and a click does not leave it open", async () => {
    const user = userEvent.setup();
    render(<IconButton label="Redo">↷</IconButton>);
    await user.tab();
    await screen.findByRole("tooltip");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows after a short hover, also on a disabled button, and hides when the pointer leaves", async () => {
    const user = userEvent.setup();
    render(
      <IconButton label="Undo" disabled>
        ↶
      </IconButton>,
    );
    await user.hover(screen.getByRole("button", { name: "Undo" }));
    expect(await screen.findByRole("tooltip")).toBeInTheDocument();
    await user.unhover(screen.getByRole("button", { name: "Undo" }));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});

describe("SegmentedControl", () => {
  function Mode({ onChange }: { onChange?: (v: string) => void }) {
    const [v, setV] = useState("dark");
    return (
      <SegmentedControl
        label="Theme mode"
        value={v}
        onChange={(x) => {
          setV(x);
          onChange?.(x);
        }}
        segments={[
          { value: "dark", label: "Dark" },
          { value: "light", label: "Light" },
          { value: "dim", label: "Dim" },
        ]}
      />
    );
  }

  it("marks the selected segment and selects on click", async () => {
    const user = userEvent.setup();
    render(<Mode />);
    expect(screen.getByRole("group", { name: "Theme mode" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dark" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Light" }));
    expect(screen.getByRole("button", { name: "Light" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Dark" })).toHaveAttribute("aria-pressed", "false");
  });

  it("arrow keys, Home and End move the selection and the focus, wrapping around", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Mode onChange={onChange} />);
    screen.getByRole("button", { name: "Dark" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "Light" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Light" })).toHaveAttribute("aria-pressed", "true");
    await user.keyboard("{End}");
    expect(screen.getByRole("button", { name: "Dim" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "Dark" })).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("button", { name: "Dim" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("button", { name: "Dark" })).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith("dark");
  });
});

describe("Toggle", () => {
  it("is a switch named by its label, flipped by the switch or the label text", async () => {
    const user = userEvent.setup();
    function Host() {
      const [on, setOn] = useState(true);
      return (
        <Toggle checked={on} onChange={setOn}>
          Only apply on top of Dark+
        </Toggle>
      );
    }
    render(<Host />);
    const sw = screen.getByRole("switch", { name: "Only apply on top of Dark+" });
    expect(sw).toHaveAttribute("aria-checked", "true");
    await user.click(sw);
    expect(sw).toHaveAttribute("aria-checked", "false");
    await user.click(screen.getByText("Only apply on top of Dark+"));
    expect(sw).toHaveAttribute("aria-checked", "true");
    sw.focus();
    await user.keyboard(" ");
    expect(sw).toHaveAttribute("aria-checked", "false");
  });
});

describe("Badge", () => {
  it("shows its text and the warn tone", () => {
    render(
      <Badge tone="warn" title="Contrast 2.8:1">
        ⚠ 2.8
      </Badge>,
    );
    const b = screen.getByText("⚠ 2.8");
    expect(b).toHaveClass("badge", "warn");
    expect(b).toHaveAttribute("title", "Contrast 2.8:1");
  });
});

describe("Popover", () => {
  const Host = () => (
    <>
      <Popover
        label="Vibe"
        renderTrigger={({ ref, props }) => (
          <Button ref={ref} {...props}>
            Vibe
          </Button>
        )}
      >
        <p>panel text</p>
      </Popover>
      <button>elsewhere</button>
    </>
  );

  it("opens on click, closes on Esc and returns focus to its button", async () => {
    const user = userEvent.setup();
    render(<Host />);
    const trigger = screen.getByRole("button", { name: "Vibe" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: "Vibe" })).toHaveTextContent("panel text");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute("aria-controls", screen.getByRole("dialog").id);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes on a click outside but not inside", async () => {
    const user = userEvent.setup();
    render(<Host />);
    await user.click(screen.getByRole("button", { name: "Vibe" }));
    await user.click(screen.getByText("panel text"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "elsewhere" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("Slider", () => {
  function Host({ onCommit }: { onCommit: (v: number) => void }) {
    const [v, setV] = useState(0);
    return <Slider aria-label="Warmth" min={-1} max={1} step={0.01} value={v} onChange={setV} onCommit={onCommit} />;
  }

  it("Shift + arrow moves a tenth of the range, commits, and stays inside the range", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<Host onCommit={onCommit} />);
    const s = screen.getByRole("slider", { name: "Warmth" });
    s.focus();
    await user.keyboard("{Shift>}{ArrowRight}{/Shift}");
    expect(s).toHaveValue("0.2");
    expect(onCommit).toHaveBeenLastCalledWith(expect.closeTo(0.2, 5));
    await user.keyboard("{Shift>}{ArrowLeft}{ArrowLeft}{/Shift}");
    expect(s).toHaveValue("-0.2");
    for (let i = 0; i < 12; i++) await user.keyboard("{Shift>}{ArrowLeft}{/Shift}");
    expect(s).toHaveValue("-1");
  });

  it("commits when focus leaves, with the value it ended on", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<Host onCommit={onCommit} />);
    const s = screen.getByRole("slider", { name: "Warmth" });
    s.focus();
    fireEvent.change(s, { target: { value: "0.02" } });
    expect(onCommit).not.toHaveBeenCalled(); // still moving
    await user.tab();
    expect(onCommit).toHaveBeenCalledWith(0.02);
  });
});

describe("TextField", () => {
  it("links the label, hint and error to the input", () => {
    const { rerender } = render(<TextField label="Publisher" value="" onChange={() => {}} hint="Lowercase letters" />);
    const input = screen.getByRole("textbox", { name: "Publisher" });
    expect(input).toHaveAccessibleDescription("Lowercase letters");
    expect(input).toHaveAttribute("aria-invalid", "false");
    rerender(
      <TextField label="Publisher" value="X" onChange={() => {}} hint="Lowercase letters" problem="Use lowercase" />,
    );
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Use lowercase");
  });

  it("reports typing", async () => {
    const onChange = vi.fn();
    render(<TextField label="Name" value="" onChange={onChange} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Name" }), "a");
    expect(onChange).toHaveBeenCalledWith("a");
  });
});

describe("Dialog", () => {
  it("opens and closes with `open`, and reports a close it didn't start", () => {
    const onClose = vi.fn();
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    };
    const { rerender } = render(
      <Dialog open={false} onClose={onClose} titleId="t">
        <h2 id="t">Export</h2>
      </Dialog>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    rerender(
      <Dialog open onClose={onClose} titleId="t">
        <h2 id="t">Export</h2>
      </Dialog>,
    );
    expect(screen.getByRole("dialog", { name: "Export" })).toBeInTheDocument();
    act(() => screen.getByRole("dialog").dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onClose).toHaveBeenCalled(); // a click on the backdrop (the dialog element itself)
  });
});

describe("Toast", () => {
  function Host({ undo }: { undo?: () => void }) {
    const toast = useToast();
    return <button onClick={() => toast.show("Deleted “Dusk”.", undo ? { undo } : undefined)}>go</button>;
  }

  it("shows one message at a time and replaces it", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Host />
      </ToastProvider>,
    );
    await user.click(screen.getByRole("button", { name: "go" }));
    expect(screen.getByRole("status", { name: "Notification" })).toHaveTextContent("Deleted “Dusk”.");
    expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "go" }));
    expect(screen.getAllByRole("status", { name: "Notification" })).toHaveLength(1);
  });

  it("Undo runs the action and closes the toast", async () => {
    const user = userEvent.setup();
    const undo = vi.fn();
    render(
      <ToastProvider>
        <Host undo={undo} />
      </ToastProvider>,
    );
    await user.click(screen.getByRole("button", { name: "go" }));
    await user.click(
      within(screen.getByRole("status", { name: "Notification" })).getByRole("button", { name: "Undo" }),
    );
    expect(undo).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("status", { name: "Notification" })).not.toBeInTheDocument();
  });

  it("goes away after 5 seconds, but not while the pointer is on it", async () => {
    vi.useFakeTimers();
    try {
      render(
        <ToastProvider>
          <Host />
        </ToastProvider>,
      );
      act(() => screen.getByRole("button", { name: "go" }).click());
      const toast = screen.getByRole("status", { name: "Notification" });
      act(() => {
        toast.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
        vi.advanceTimersByTime(6000);
      });
      expect(screen.getByRole("status", { name: "Notification" })).toBeInTheDocument();
      act(() => {
        toast.dispatchEvent(new PointerEvent("pointerout", { bubbles: true }));
        vi.advanceTimersByTime(5100);
      });
      expect(screen.queryByRole("status", { name: "Notification" })).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
