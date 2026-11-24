import { palette } from "./palette";
import type { PortTarget } from "./port";
import { TERMINALS } from "./terminals";

export * from "./port";

/** Every port. Adding one is a new file in this folder plus one line here; the shared tests then cover it. */
export const TARGETS: PortTarget[] = [palette, ...TERMINALS];

export function targetById(id: string): PortTarget | undefined {
  return TARGETS.find((t) => t.id === id);
}
