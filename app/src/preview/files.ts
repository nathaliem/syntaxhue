import type { RoleId } from "../engine/theme";

/** The explorer tree shown in the preview and in generated screenshots. The active file takes the sample's name. */
export const FILES: {
  name: string;
  depth: number;
  role?: RoleId;
  badge?: string;
  folder?: boolean;
  active?: boolean;
}[] = [
  { name: "src", depth: 0, folder: true },
  { name: "engine", depth: 1, folder: true },
  { name: "color.ts", depth: 2 },
  { name: "", depth: 2, active: true, role: "warning", badge: "M" },
  { name: "export.ts", depth: 2, role: "success", badge: "U" },
  { name: "contrast.ts", depth: 2, role: "error", badge: "1" },
  { name: "App.tsx", depth: 1 },
  { name: "package.json", depth: 0 },
  { name: "README.md", depth: 0 },
];
