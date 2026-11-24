import { isHex } from "./color";
import { ROLE_IDS, THEME_VERSION, type FontStyle, type ThemeState } from "./theme";

/**
 * Compact URL encoding: <version>.<mode>.<name>.<hex,hex,...>.<styles>  (version = THEME_VERSION)
 * styles: per role, "i" italic, "b" bold, "u" underline, "-" none. Locks are not part of the link.
 */
export function encodeTheme(t: ThemeState): string {
  const colors = ROLE_IDS.map((id) => t.roles[id].color.slice(1)).join("");
  const styles = ROLE_IDS.map((id) => {
    const f = t.roles[id].fontStyle;
    return (
      (f.includes("italic") ? "i" : "") + (f.includes("bold") ? "b" : "") + (f.includes("underline") ? "u" : "") || "-"
    );
  }).join(",");
  // "." separates fields, so escape it in the name (encodeURIComponent leaves it alone).
  const name = encodeURIComponent(t.name).replace(/\./g, "%2E");
  return [String(THEME_VERSION), t.mode === "dark" ? "d" : "l", name, colors, styles].join(".");
}

export function decodeTheme(s: string): ThemeState | null {
  const parts = s.split(".");
  // The first field is the schema version. Links from a newer app (or garbage) are refused, not guessed at.
  if (parts.length < 5 || parts[0] !== String(THEME_VERSION)) return null;
  // Read fixed fields from both ends, so links made before dots were escaped still open.
  const m = parts[1];
  const rawName = parts.slice(2, -2).join(".");
  const [colors, styles] = parts.slice(-2);
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
    if (st.includes("u")) fontStyle.push("underline");
    roles[ROLE_IDS[i]] = { color, locked: false, fontStyle };
  }
  return { version: THEME_VERSION, name, mode: m === "l" ? "light" : "dark", roles };
}
