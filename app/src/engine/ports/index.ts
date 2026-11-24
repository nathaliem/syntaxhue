import { palette } from "./palette";
import type { PortTarget } from "./port";
import { TERMINALS } from "./terminals";
import { neovim } from "./neovim";
import { sublime } from "./sublime";
import { zed } from "./zed";

export * from "./port";

/** Every port. Adding one is a new file in this folder plus one line here; the shared tests then cover it. */
export const TARGETS: PortTarget[] = [palette, zed, sublime, neovim, ...TERMINALS];

export function targetById(id: string): PortTarget | undefined {
  return TARGETS.find((t) => t.id === id);
}
