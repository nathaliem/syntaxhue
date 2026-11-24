import { ROLES } from "../theme";
import type { PortTarget } from "./port";

/** The plain palette as JSON: design tokens for anything we have no port for. Also the reference target. */
export const palette: PortTarget = {
  id: "palette",
  label: "Palette (JSON)",
  group: "data",
  install: "Use the values wherever you need them: a design tool, a CSS file or your own editor settings.",
  files: (input) => [
    {
      path: "palette.json",
      content:
        JSON.stringify(
          {
            name: input.name,
            mode: input.mode,
            roles: Object.fromEntries(ROLES.map((r) => [r.id, input.roles[r.id]])),
            surfaces: input.surfaces,
          },
          null,
          2,
        ) + "\n",
    },
  ],
  uses: (input) => ROLES.map((r) => ({ role: r.id, color: input.roles[r.id], on: input.roles.bg })),
};
