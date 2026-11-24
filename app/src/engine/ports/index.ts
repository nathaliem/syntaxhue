import { palette } from "./palette";
import type { PortTarget } from "./port";

export * from "./port";

/** Every port. Adding one is a new file in this folder plus one line here; the shared tests then cover it. */
export const TARGETS: PortTarget[] = [palette];

export function targetById(id: string): PortTarget | undefined {
  return TARGETS.find((t) => t.id === id);
}
