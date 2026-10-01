import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const names = ["dayfox", "dawnfox", "nightfox", "duskfox", "nordfox", "terafox", "carbonfox"];
export const rgb = hex => {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error(`Invalid hex color: ${hex}`);
  return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
};
const hex = channels => "#" + channels.map(c => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, "0")).join("");
export const blend = (a, b, fraction) => {
  const end = rgb(b);
  return hex(rgb(a).map((value, i) => value + (end[i] - value) * fraction));
};
export const brighten = (color, amount) => {
  const channels = rgb(color), maximum = Math.max(...channels);
  const next = Math.max(0, Math.min(255, maximum + amount * 2.55));
  return hex(maximum === 0 ? [next, next, next] : channels.map(value => value * next / maximum));
};
export function hsl(color) {
  const [r, g, b] = rgb(color).map(c => c / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  const h = delta === 0 ? 0 : 60 * (max === r ? ((g - b) / delta + 6) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4);
  return [h.toFixed(8), `${(s * 100).toFixed(8)}%`, `${(l * 100).toFixed(8)}%`];
}

export function parsePalette(source, expectedName) {
  const name = source.match(/name = "(\w+)"/)?.[1];
  if (name !== expectedName) throw new Error(`Palette name mismatch: ${expectedName}`);
  const light = source.match(/light = (true|false)/)?.[1] === "true";
  const block = source.match(/local palette = \{([\s\S]*?)\n\}/)?.[1];
  if (!block) throw new Error(`Missing palette block: ${name}`);
  const constants = Object.fromEntries([...source.matchAll(/local (bg|fg) = C\("(#[0-9a-f]{6})"\)/gi)].map(m => [m[1], m[2].toLowerCase()]));
  const palette = {};
  for (const line of block.split("\n")) {
    const assignment = line.match(/^\s*(\w+)\s*=\s*(.*?),?\s*(?:--.*)?$/);
    if (!assignment) continue;
    const [, key] = assignment;
    const expression = assignment[2].replace(/,?\s*(?:--.*)?$/, "");
    const literal = expression.match(/^"(#[0-9a-f]{6})"$/i);
    const shade = expression.match(/^Shade\.new\("(#[0-9a-f]{6})",\s*("[^"]+"|[-.\d]+),\s*("[^"]+"|[-.\d]+)(?:,\s*true)?\)$/i);
    const dynamic = expression.match(/^(bg|fg):(?:(brighten)\(([-.\d]+)\):|(blend)\((bg|fg),\s*([-.\d]+)\):)?to_css\(\)$/);
    if (literal) palette[key] = literal[1].toLowerCase();
    else if (shade) {
      const base = shade[1].toLowerCase();
      const resolve = value => value.startsWith('"') ? value.slice(1, -1).toLowerCase() : blend(base, Number(value) < 0 ? "#000000" : "#ffffff", Math.abs(Number(value)));
      palette[key] = { base, bright: resolve(shade[2]), dim: resolve(shade[3]) };
    } else if (dynamic) {
      if (!constants[dynamic[1]]) throw new Error(`Missing color constant: ${expression}`);
      palette[key] = dynamic[2] ? brighten(constants[dynamic[1]], Number(dynamic[3]))
        : dynamic[4] ? blend(constants[dynamic[1]], constants[dynamic[5]], Number(dynamic[6]))
        : constants[dynamic[1]];
    } else throw new Error(`Unsupported ${name} palette expression: ${key} = ${expression}`);
  }
  for (const key of ["bg0", "bg1", "bg2", "bg3", "bg4", "fg0", "fg1", "fg2", "fg3", "sel0", "sel1", "comment", "blue", "green", "red", "yellow", "magenta", "cyan", "orange", "pink"]) {
    if (!palette[key]) throw new Error(`Missing ${name}.${key}`);
  }
  const resolve = expression => {
    const m = expression.match(/^(?:pal|spec)\.(\w+)(?:\.(base|bright|dim))?$/);
    const value = m && (m[2] ? palette[m[1]]?.[m[2]] : palette[m[1]]);
    if (typeof value !== "string") throw new Error(`Unsupported ${name} role: ${expression}`);
    return value;
  };
  const roles = kind => {
    const text = source.match(new RegExp(`spec\\.${kind} = \\{([\\s\\S]*?)\\n  \\}`))?.[1];
    if (!text) throw new Error(`Missing ${name} ${kind} roles`);
    return Object.fromEntries([...text.matchAll(/^\s*(\w+)\s*=\s*([^,\n]+),/gm)].map(m => [m[1], resolve(m[2].trim())]));
  };
  return { name, light, palette, syntax: roles("syntax"), diagnostics: roles("diag") };
}

export async function loadPalettes() {
  return Promise.all(names.map(async name => parsePalette(await readFile(path.join(root, "palettes", `${name}.lua`), "utf8"), name)));
}

export function variables({ light, palette: p, syntax: s, diagnostics: d }) {
  const v = {};
  const set = (value, keys) => {
    for (const key of keys.split(" ")) v[`--${key}`] = value;
  };
  set(p.bg1, "background-primary background-primary-alt tab-background-active modal-background search-result-background code-background");
  set(p.bg0, "background-secondary background-secondary-alt tab-container-background titlebar-background titlebar-background-focused ribbon-background ribbon-background-collapsed status-bar-background modal-sidebar-background");
  set(p.bg2, "background-modifier-form-field interactive-normal menu-background table-header-background");
  set(p.bg3, "background-modifier-hover background-modifier-active-hover interactive-hover nav-item-background-hover code-bracket-background");
  set(p.bg4, "background-modifier-border background-modifier-border-hover menu-border-color modal-border-color tab-divider-color tab-outline-color titlebar-border-color status-bar-border-color nav-indentation-guide-color hr-color table-border-color table-header-border-color checkbox-border-color code-border-color");
  set(p.fg1, "text-normal caret-color nav-item-color-active nav-item-color-selected nav-item-color-hover tab-text-color-active tab-text-color-focused-active tab-text-color-focused-active-current titlebar-text-color-focused nav-heading-color nav-heading-color-hover icon-color-hover icon-color-focused inline-title-color graph-text");
  set(p.fg2, "text-muted nav-item-color tab-text-color tab-text-color-focused titlebar-text-color status-bar-text-color nav-heading-color-collapsed nav-heading-color-collapsed-hover nav-collapse-icon-color icon-color blockquote-color");
  set(p.fg3, "text-faint input-placeholder-color nav-collapse-icon-color-collapsed heading-formatting");
  set(p.blue.base, "text-accent text-accent-hover color-accent interactive-accent interactive-accent-hover background-modifier-border-focus link-color link-color-hover link-external-color link-external-color-hover link-unresolved-color checkbox-color checkbox-color-hover icon-color-active nav-item-color-highlighted tab-text-color-focused-highlighted graph-node-focused fox-link-color");
  set(p.bg1, "text-on-accent text-on-accent-inverted checkbox-marker-color");
  set(p.sel0, "text-selection nav-item-background-active nav-item-background-selected table-selection tag-background tag-background-hover");
  set(p.sel1, "text-highlight-bg");
  set(p.fg1, "fox-selection-foreground");
  set(d.error, "text-error");
  set(d.ok, "text-success");
  set(d.warn, "text-warning");
  set(blend(p.bg1, d.error, light ? 0.16 : 0.20), "background-modifier-error");
  set(blend(p.bg1, d.ok, light ? 0.16 : 0.20), "background-modifier-success");
  set(blend(p.bg1, d.warn, light ? 0.16 : 0.20), "background-modifier-warning");
  set(p.blue.base, "tag-color tag-color-hover tag-border-color tag-border-color-hover");
  set(p.fg1, "code-normal");
  for (const [target, role] of Object.entries({ "code-comment": "comment", "code-function": "func", "code-keyword": "keyword", "code-operator": "operator", "code-property": "field", "code-punctuation": "bracket", "code-string": "string", "code-tag": "type", "code-value": "number", "fox-syntax-variable": "variable", "fox-syntax-regexp": "regex" })) {
    if (!s[role]) throw new Error(`Missing syntax role ${role}`);
    set(s[role], target);
  }
  set(d.error, "code-important");
  for (let i = 1; i <= 6; i++) set(p.fg0, `h${i}-color`);
  const scale = { "00": p.bg1, "05": p.bg0, "10": p.bg2, "20": p.bg2, "25": p.bg3, "30": p.bg4, "35": p.bg4, "40": p.fg3, "50": p.fg3, "60": p.fg2, "70": p.fg2, "100": p.fg1 };
  for (const [step, value] of Object.entries(scale)) set(value, `color-base-${step}`);
  for (const [target, source] of Object.entries({ red: "red", orange: "orange", yellow: "yellow", green: "green", cyan: "cyan", blue: "blue", purple: "magenta", pink: "pink" })) {
    set(p[source].base, `color-${target}`);
    set(rgb(p[source].base).join(", "), `color-${target}-rgb`);
  }
  const [h, sat, l] = hsl(p.blue.base);
  set(h, "accent-h"); set(sat, "accent-s"); set(l, "accent-l");
  set(`${h}, ${sat}, ${l}`, "color-accent-hsl interactive-accent-hsl");
  set(p.blue.bright, "color-accent-1"); set(p.blue.dim, "color-accent-2");
  for (const role of ["success", "error"]) set(rgb(v[`--background-modifier-${role}`]).join(", "), `background-modifier-${role}-rgb`);
  set(rgb(p.sel1).join(", "), "text-highlight-bg-rgb");
  set("1px", "hr-thickness");
  set("1", "link-unresolved-opacity");
  set("normal", "callout-blend-mode");
  return v;
}
