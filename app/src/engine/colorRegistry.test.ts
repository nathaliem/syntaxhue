import { describe, expect, it } from "vitest";
import registry from "./__fixtures__/vscode-colors.json";
import { workbenchColors } from "./derive";
import { generate } from "./theme";

/**
 * `vscode-colors.json` is every color id VS Code registers, read from an installed VS Code by `ci/snapshot-colors.mjs`
 * (refresh it when a new VS Code ships). These tests keep our keys real, and keep the areas of the default layout
 * covered, so a base theme's own colors don't show through next to the user's palette.
 */
const ids = new Set(registry.ids);
const written = new Set(Object.keys(workbenchColors(generate(7, "dark"))));

/** Areas of the default workbench. Every registered id that starts with one of these must be written. */
const COVERED_PREFIXES = [
  "activityBar.",
  "activityBarBadge.",
  "activityErrorBadge.",
  "activityWarningBadge.",
  "badge.",
  "banner.",
  "breadcrumb",
  "button.",
  "checkbox.",
  "commandCenter.",
  "debug",
  "diffEditor",
  "dropdown.",
  "editor.",
  "editorBracket",
  "editorCodeLens.",
  "editorError.",
  "editorGroup",
  "editorGutter.",
  "editorHoverWidget.",
  "editorInfo.",
  "editorInlayHint.",
  "editorLightBulb",
  "editorLink.",
  "editorMarkerNavigation",
  "editorOverviewRuler.",
  "editorStickyScroll",
  "editorSuggestWidget",
  "editorWarning.",
  "editorWidget.",
  "extensionButton.",
  "gitDecoration.",
  "input.",
  "inputOption.",
  "inputValidation.",
  "keybindingLabel.",
  "list.",
  "listFilterWidget.",
  "menu.",
  "menubar.",
  "minimap",
  "notification",
  "panel",
  "peekView",
  "pickerGroup.",
  "profileBadge.",
  "progressBar.",
  "quickInput",
  "scrollbar",
  "settings.",
  "sideBar",
  "statusBar",
  "symbolIcon.",
  "tab.",
  "terminal.",
  "text",
  "titleBar.",
  "toolbar.",
  "tree.",
];

/** Ids under a covered area that are left out on purpose, with the reason. */
const EXEMPT: Record<string, string> = {
  "editor.compositionBorder": "only while typing with an input method editor",
  "editor.findMatchBorder": "the default is no border",
  "editor.findMatchHighlightBorder": "the default is no border",
  "editor.findMatchForeground": "the default keeps the text color",
  "editor.findMatchHighlightForeground": "the default keeps the text color",
  "editor.findRangeHighlightBorder": "the default is no border",
  "editor.lineHighlightBorder": "the default is no border",
  "editor.rangeHighlightBorder": "the default is no border",
  "editor.selectionForeground": "only used in high contrast",
  "editor.selectionHighlightBorder": "the default is no border",
  "editor.symbolHighlightBorder": "the default is no border",
  "editor.wordHighlightBorder": "the default is no border",
  "editor.wordHighlightStrongBorder": "the default is no border",
  "editor.wordHighlightTextBorder": "the default is no border",
  "editor.snippetFinalTabstopHighlightBackground": "the default is transparent",
  "editor.snippetTabstopHighlightBorder": "the default is no border",
  "editor.border": "the default is no border",
  "editor.wordHighlightBackground": "already written in the core set",
  "button.secondaryBorder": "the default is no border",
  "diffEditor.insertedTextBorder": "the default is no border",
  "diffEditor.removedTextBorder": "the default is no border",
  "editorError.border": "the default is no border",
  "editorInfo.border": "the default is no border",
  "editorWarning.border": "the default is no border",
  "extensionButton.border": "the default is no border",
  "list.filterMatchBorder": "the default is no border",
  "peekViewEditor.matchHighlightBorder": "the default is no border",
  "terminal.findMatchBorder": "the default is no border",
  "terminal.findMatchHighlightBorder": "the default is no border",
  "panel.dropBorder": "only while dragging a view",
  "editorSuggestWidget.focusOutline": "the default is no outline",
  "sideBarActivityBarTop.border": "only with the activity bar on top",
  "editorOverviewRuler.commentForeground": "only with a comments extension",
  "editorOverviewRuler.commentDraftForeground": "only with a comments extension",
  "editorOverviewRuler.commentUnresolvedForeground": "only with a comments extension",
  "editorOverviewRuler.inlineChatInserted": "only with inline chat",
  "editorOverviewRuler.inlineChatRemoved": "only with inline chat",
  "minimap.chatEditHighlight": "only with chat edits",
  "minimap.foregroundOpacity": "an opacity, not a color the user picks",
  quickInputAlignmentCenter: "a layout setting that shares the color registry's prefix, not a color",
  quickInputAlignmentTop: "a layout setting that shares the color registry's prefix, not a color",
  statusBar: "a context key that shares the color registry's prefix, not a color",
};

describe("VS Code color registry snapshot", () => {
  it("covers a real VS Code (more than 900 ids, from one version)", () => {
    expect(registry.vscode).toMatch(/^\d+\.\d+\.\d+/);
    expect(registry.ids.length).toBeGreaterThan(900);
  });

  it("every key we write is a color VS Code knows", () => {
    expect([...written].filter((k) => !ids.has(k))).toEqual([]);
  });

  it("no color in the covered areas of the default workbench is missing", () => {
    const needed = registry.ids.filter((k) => COVERED_PREFIXES.some((p) => k.startsWith(p)) && !(k in EXEMPT));
    const missing = needed.filter((k) => !written.has(k));
    expect(missing, `${missing.length} missing:\n${missing.join("\n")}`).toEqual([]);
  });

  it("every exemption names an id that exists", () => {
    expect(Object.keys(EXEMPT).filter((k) => !ids.has(k))).toEqual([]);
  });
});
