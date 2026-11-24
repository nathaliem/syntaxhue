/**
 * Checks an exported theme file against the structure VS Code documents for color themes
 * (https://code.visualstudio.com/api/references/theme-color): VS Code builds its schema at run time, so there is no
 * static schema file to validate against. Returns a list of problems; empty means the file is well formed.
 */
const HEX = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const TYPES = ["dark", "light", "hc", "hcLight"];
const FONT_STYLES = ["italic", "bold", "underline", "strikethrough"];
const KEY = /^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z0-9]+)*$/;

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export function validateThemeFile(file: unknown): string[] {
  const out: string[] = [];
  if (!isObject(file)) return ["The theme file must be a JSON object."];

  if (typeof file.name !== "string" || !file.name.trim()) out.push("name must be a non-empty string.");
  if (typeof file.type !== "string" || !TYPES.includes(file.type)) out.push(`type must be one of ${TYPES.join(", ")}.`);
  if ("semanticHighlighting" in file && typeof file.semanticHighlighting !== "boolean") {
    out.push("semanticHighlighting must be a boolean.");
  }
  if ("$schema" in file && typeof file.$schema !== "string") out.push("$schema must be a string.");

  if (!isObject(file.colors)) out.push("colors must be an object.");
  else {
    for (const [k, v] of Object.entries(file.colors)) {
      if (!KEY.test(k)) out.push(`colors: "${k}" is not a valid color id.`);
      if (typeof v !== "string" || !HEX.test(v)) out.push(`colors.${k}: ${JSON.stringify(v)} is not a hex color.`);
    }
  }

  if (!Array.isArray(file.tokenColors)) out.push("tokenColors must be an array.");
  else {
    file.tokenColors.forEach((rule, i) => {
      const at = `tokenColors[${i}]`;
      if (!isObject(rule)) return out.push(`${at} must be an object.`);
      const scope = rule.scope;
      const scopes = typeof scope === "string" ? [scope] : Array.isArray(scope) ? scope : null;
      if (!scopes || scopes.length === 0) out.push(`${at}.scope must be a string or a non-empty array of strings.`);
      else if (scopes.some((s) => typeof s !== "string" || !s.trim()))
        out.push(`${at}.scope has an empty or non-string entry.`);
      const settings = rule.settings;
      if (!isObject(settings)) return out.push(`${at}.settings must be an object.`);
      if ("foreground" in settings && (typeof settings.foreground !== "string" || !HEX.test(settings.foreground))) {
        out.push(`${at}.settings.foreground is not a hex color.`);
      }
      if ("fontStyle" in settings) {
        const fs = settings.fontStyle;
        const parts = typeof fs === "string" ? fs.split(/\s+/).filter(Boolean) : null;
        if (!parts || parts.some((p) => !FONT_STYLES.includes(p))) {
          out.push(`${at}.settings.fontStyle must be a space separated mix of ${FONT_STYLES.join(", ")}.`);
        }
      }
    });
  }

  if ("semanticTokenColors" in file) {
    if (!isObject(file.semanticTokenColors)) out.push("semanticTokenColors must be an object.");
    else {
      for (const [selector, v] of Object.entries(file.semanticTokenColors)) {
        // A selector is `type`, `type.modifier` or `*.modifier`, optionally with `:language`.
        if (!/^(\*|[a-zA-Z]+)(\.[a-zA-Z]+)*(:[\w-]+)?$/.test(selector))
          out.push(`semanticTokenColors: "${selector}" is not a selector.`);
        if (typeof v === "string") {
          if (!HEX.test(v)) out.push(`semanticTokenColors.${selector} is not a hex color.`);
        } else if (isObject(v)) {
          if ("foreground" in v && (typeof v.foreground !== "string" || !HEX.test(v.foreground))) {
            out.push(`semanticTokenColors.${selector}.foreground is not a hex color.`);
          }
          for (const flag of ["italic", "bold", "underline", "strikethrough"]) {
            if (flag in v && typeof v[flag] !== "boolean")
              out.push(`semanticTokenColors.${selector}.${flag} must be a boolean.`);
          }
        } else out.push(`semanticTokenColors.${selector} must be a color or an object.`);
      }
    }
  }
  return out;
}
