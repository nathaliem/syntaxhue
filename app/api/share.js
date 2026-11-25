// src/engine/color.ts
function isHex(s) {
	return /^#[0-9a-fA-F]{6}$/.test(s);
}
// src/engine/theme.ts
const ROLE_IDS = [
	"bg",
	"fg",
	"accent",
	"muted",
	"keyword",
	"string",
	"function",
	"type",
	"variable",
	"constant",
	"operator",
	"error",
	"warning",
	"info",
	"success"
];
Object.fromEntries([
	{
		id: "bg",
		label: "Background",
		group: "Base",
		min: 0,
		hint: "Editor background. Sidebar, tabs and panels are derived from it."
	},
	{
		id: "fg",
		label: "Text",
		group: "Base",
		min: 7,
		hint: "Default text in the editor and UI."
	},
	{
		id: "accent",
		label: "Accent",
		group: "Base",
		min: 3,
		hint: "Focus borders, active tab, status bar, buttons, badges."
	},
	{
		id: "muted",
		label: "Comments",
		group: "Base",
		min: 3,
		hint: "Comments, line numbers, inactive tabs and secondary text.",
		styleable: true
	},
	{
		id: "keyword",
		label: "Keyword",
		group: "Syntax",
		min: 4.5,
		hint: "import, const, if, return, function…",
		styleable: true
	},
	{
		id: "string",
		label: "String",
		group: "Syntax",
		min: 4.5,
		hint: "Strings and regular expressions.",
		styleable: true
	},
	{
		id: "function",
		label: "Function",
		group: "Syntax",
		min: 4.5,
		hint: "Function and method names.",
		styleable: true
	},
	{
		id: "type",
		label: "Type",
		group: "Syntax",
		min: 4.5,
		hint: "Types, classes and interfaces.",
		styleable: true
	},
	{
		id: "variable",
		label: "Variable",
		group: "Syntax",
		min: 4.5,
		hint: "Variables, parameters and properties.",
		styleable: true
	},
	{
		id: "constant",
		label: "Number",
		group: "Syntax",
		min: 4.5,
		hint: "Numbers, booleans and constants.",
		styleable: true
	},
	{
		id: "operator",
		label: "Operator",
		group: "Syntax",
		min: 4.5,
		hint: "Operators and punctuation.",
		styleable: true
	},
	{
		id: "error",
		label: "Error",
		group: "Status",
		min: 4.5,
		hint: "Error squiggles, deleted files, failing tests."
	},
	{
		id: "warning",
		label: "Warning",
		group: "Status",
		min: 4.5,
		hint: "Warnings and modified files."
	},
	{
		id: "info",
		label: "Info",
		group: "Status",
		min: 4.5,
		hint: "Info diagnostics and hints."
	},
	{
		id: "success",
		label: "Success",
		group: "Status",
		min: 4.5,
		hint: "Added files and passing states."
	}
].map((r) => [r.id, r]));
/** Global "vibe" sliders, each -1..1 with 0 = no change. Applied on top of the roles, never stored in them. */
const VIBE_KEYS = [
	"contrast",
	"saturation",
	"warmth",
	"depth"
];
const ZERO_VIBE = Object.freeze({
	contrast: 0,
	saturation: 0,
	warmth: 0,
	depth: 0
});
// src/engine/share.ts
/**
* Share links carry the theme in the URL hash: `#t=<link>`.
*
* Current format: "p" + base64url of a small binary payload, about 100 characters for a typical theme.
* (lz-string was measured first and made links longer: hex colors are close to random, so they don't
* compress, while packing them as bytes saves a third.)
*
*   byte 0        THEME_VERSION the payload was made with. Version 1 payloads (made before vibe existed)
*                 are still read; any other version is refused.
*   byte 1        flags: bit 0 = light mode, bit 1 = vibe values present (version 2+). Other bits must be 0.
*   bytes 2-3     locks: bit i set = role i (ROLE_IDS order) is locked
*   next 8 bytes  font styles, one nibble per role: 1 italic, 2 bold, 4 underline
*   next 45 bytes colors, 3 bytes (r, g, b) per role
*   4 bytes       only if the vibe flag is set: contrast, saturation, warmth, depth as signed bytes (value x 100)
*   2 bytes       only if the picked flag is set (bit 2): bit i set = role i was set by hand, so vibe leaves it alone
*   rest          theme name, UTF-8
*
* Themes with all vibe sliders at 0 leave the vibe out, which keeps their links short.
*
* Legacy format, still readable: "1.<d|l>.<name>.<hex hex ...>.<styles>" (no locks, no vibe).
*/
const STYLE_BITS = [
	["italic", 1],
	["bold", 2],
	["underline", 4]
];
const FLAG_LIGHT = 1;
const FLAG_VIBE = 2;
const FLAG_PICKED = 4;
const OLDEST_PAYLOAD_VERSION = 1;
const N = ROLE_IDS.length;
const STYLE_BYTES = Math.ceil(N / 2);
const FIXED = 4 + STYLE_BYTES + N * 3;
const NAME_MAX = 60;
if (N > 16) throw new Error("Share links store locks in 16 bits; extend the format before adding more roles.");
function fromBase64Url(s) {
	try {
		const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
		return Uint8Array.from(bin, (c) => c.charCodeAt(0));
	} catch {
		return null;
	}
}
/** Reads any share link we have ever made. Null for anything we can't or won't read. */
function decodeTheme(s) {
	if (/^p[A-Za-z0-9_-]+$/.test(s)) return decodeBinary(s.slice(1));
	return decodeLegacy(s);
}
function decodeBinary(payload) {
	const bytes = fromBase64Url(payload);
	if (!bytes || bytes.length < FIXED) return null;
	const version = bytes[0];
	if (version < OLDEST_PAYLOAD_VERSION || version > 2) return null;
	const flags = bytes[1];
	if (flags & -8 || flags & FLAG_VIBE && version < 2) return null;
	const hasVibe = (flags & FLAG_VIBE) !== 0;
	const hasPicked = (flags & FLAG_PICKED) !== 0;
	const pickedAt = FIXED + (hasVibe ? VIBE_KEYS.length : 0);
	const nameAt = pickedAt + (hasPicked ? 2 : 0);
	if (bytes.length < nameAt) return null;
	const picks = hasPicked ? bytes[pickedAt] | bytes[pickedAt + 1] << 8 : 0;
	const vibe = { ...ZERO_VIBE };
	if (hasVibe) for (const [i, k] of VIBE_KEYS.entries()) {
		const v = (bytes[FIXED + i] << 24 >> 24) / 100;
		if (v < -1 || v > 1) return null;
		vibe[k] = v;
	}
	let name;
	try {
		name = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(nameAt)).slice(0, NAME_MAX);
	} catch {
		return null;
	}
	const locks = bytes[2] | bytes[3] << 8;
	const roles = {};
	ROLE_IDS.forEach((id, i) => {
		const nibble = bytes[4 + (i >> 1)] >> (i % 2 === 0 ? 0 : 4) & 15;
		const at = 4 + STYLE_BYTES + i * 3;
		const rgb = bytes[at] << 16 | bytes[at + 1] << 8 | bytes[at + 2];
		roles[id] = {
			color: "#" + rgb.toString(16).padStart(6, "0"),
			locked: (locks & 1 << i) !== 0,
			...(picks & 1 << i) !== 0 ? { picked: true } : {},
			fontStyle: STYLE_BITS.filter(([, bit]) => nibble & bit).map(([style]) => style)
		};
	});
	return {
		version: 2,
		name,
		mode: flags & FLAG_LIGHT ? "light" : "dark",
		roles,
		vibe
	};
}
/** Links made before binary links existed: "1.<mode>.<name>.<hex...>.<styles>". They carry no locks. */
function decodeLegacy(s) {
	const parts = s.split(".");
	if (parts.length < 5 || parts[0] !== "1") return null;
	const m = parts[1];
	const rawName = parts.slice(2, -2).join(".");
	const [colors, styles] = parts.slice(-2);
	if (colors.length !== N * 6) return null;
	const styleList = styles.split(",");
	if (styleList.length !== N) return null;
	let name;
	try {
		name = decodeURIComponent(rawName).slice(0, NAME_MAX);
	} catch {
		return null;
	}
	const roles = {};
	for (let i = 0; i < N; i++) {
		const color = "#" + colors.slice(i * 6, i * 6 + 6).toLowerCase();
		if (!isHex(color)) return null;
		const st = styleList[i];
		const fontStyle = [];
		if (st.includes("i")) fontStyle.push("italic");
		if (st.includes("b")) fontStyle.push("bold");
		if (st.includes("u")) fontStyle.push("underline");
		roles[ROLE_IDS[i]] = {
			color,
			locked: false,
			fontStyle
		};
	}
	return {
		version: 2,
		name,
		mode: m === "l" ? "light" : "dark",
		roles,
		vibe: { ...ZERO_VIBE }
	};
}
// src/server/shareMeta.ts
/**
* Link-preview support for shared themes. A preview link looks like `https://syntaxhue.dev/s?t=<code>`: the page is
* the normal app, but the head carries the theme's name and a picture of it, so chat apps and social posts show
* that theme instead of the generic card.
*/
/** Only the current compact share code is accepted by the server; anything else gets the generic card. */
const SHARE_CODE = /^p[A-Za-z0-9_-]{60,400}$/;
const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function setMeta(html, attr, key, content) {
	const tag = `<meta ${attr}="${key}" content="${escapeHtml(content)}" />`;
	const re = new RegExp(`<meta\\s[^>]*?${attr}="${key.replace(/[:.]/g, "\\$&")}"[^>]*>`);
	return re.test(html) ? html.replace(re, tag) : html.replace("</head>", `    ${tag}\n  </head>`);
}
function shareHtml(html, opts) {
	const { origin, code, name } = opts;
	const url = `${origin}/s?t=${code}`;
	const image = `${origin}/api/og?t=${code}`;
	const title = `${name}: a VS Code color theme made with SyntaxHue`;
	const description = "Open this theme in SyntaxHue to tweak it, then paste it into VS Code or export it as an extension.";
	let out = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
	out = setMeta(out, "name", "description", description);
	out = setMeta(out, "property", "og:title", title);
	out = setMeta(out, "property", "og:description", description);
	out = setMeta(out, "property", "og:url", url);
	out = setMeta(out, "property", "og:image", image);
	out = setMeta(out, "property", "og:image:alt", `The colors of the theme “${name}” and a few lines of code painted with them`);
	out = setMeta(out, "name", "twitter:title", title);
	out = setMeta(out, "name", "twitter:description", description);
	out = setMeta(out, "name", "twitter:image", image);
	out = setMeta(out, "name", "robots", "noindex");
	return out;
}
// server/share.ts
/** `/s?t=<code>`: the normal app page, with the shared theme's name and picture in its head for link previews. */
async function GET(request) {
	const url = new URL(request.url);
	const page = await fetch(`${url.origin}/index.html`);
	const html = await page.text();
	const code = url.searchParams.get("t") ?? "";
	const theme = SHARE_CODE.test(code) ? decodeTheme(code) : null;
	return new Response(theme ? shareHtml(html, {
		origin: url.origin,
		code,
		name: theme.name
	}) : html, {
		status: page.status,
		headers: {
			"Content-Type": "text/html; charset=utf-8",
			"Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400"
		}
	});
}
export { GET };
