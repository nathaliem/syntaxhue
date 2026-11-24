export const SAMPLE_TS = `// Pick colors that stay readable on any background
import { contrast, oklch } from "./color";

export type Role = "keyword" | "string" | "type";

interface Palette {
  name: string;
  roles: Map<Role, string>;
  locked: boolean;
}

const MIN_CONTRAST = 4.5;

export async function shuffle(seed: number): Promise<Palette> {
  const hue = (seed * 137.5) % 360;
  const bg = oklch(0.21, 0.02, hue);
  if (contrast(fg, bg) < MIN_CONTRAST) {
    return lighten(fg, 0.05);
  }
  return { name: \`Theme \${seed}\`, roles: new Map(), locked: false };
}`;
