import { isHex } from "./color";
import { ROLE_IDS, type FontStyle, type ThemeState } from "./theme";

/**
 * Compact URL encoding: v1.<mode>.<name>.<hex,hex,...>.<styles>
 * styles: per role, "i" italic, "b" bold, "-" none; locks: "l" suffix per role in a bitmask.
 */
export function encodeTheme(t: ThemeState): string {
  const colors = ROLE_IDS.map((id) => t.roles[id].color.slice(1)).join("");
  const styles = ROLE_IDS.map((id) => {
    const f = t.roles[id].fontStyle;
    return (f.includes("italic") ? "i" : "") + (f.includes("bold") ? "b" : "") || "-";
  }).join(",");
  return ["1", t.mode === "dark" ? "d" : "l", encodeURIComponent(t.name), colors, styles].join(".");
}

export function decodeTheme(s: string): ThemeState | null {
  const parts = s.split(".");
  if (parts.length !== 5 || parts[0] !== "1") return null;
  const [, m, rawName, colors, styles] = parts;
  if (colors.length !== ROLE_IDS.length * 6) return null;
  const styleList = styles.split(",");
  if (styleList.length !== ROLE_IDS.length) return null;
  let name: string;
  try {
    name = decodeURIComponent(rawName).slice(0, 60);
  } catch {
    return null;
  }
  const roles = {} as ThemeState["roles"];
  for (let i = 0; i < ROLE_IDS.length; i++) {
    const color = "#" + colors.slice(i * 6, i * 6 + 6).toLowerCase();
    if (!isHex(color)) return null;
    const st = styleList[i];
    const fontStyle: FontStyle[] = [];
    if (st.includes("i")) fontStyle.push("italic");
    if (st.includes("b")) fontStyle.push("bold");
    roles[ROLE_IDS[i]] = { color, locked: false, fontStyle };
  }
  return { version: 1, name, mode: m === "l" ? "light" : "dark", roles };
}
