import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { names, root, loadPalettes, parsePalette, variables, blend, brighten, pilotfox, loadPilotfox } from "../scripts/palettes.mjs";
import { generate } from "../scripts/build.mjs";

const palettes = await loadPalettes();
const backgrounds = { dayfox: "#f6f2ee", dawnfox: "#faf4ed", nightfox: "#192330", duskfox: "#232136", nordfox: "#2e3440", terafox: "#152528", carbonfox: "#161616" };

test("all seven upstream variants are parsed with the correct modes", () => {
  assert.deepEqual(palettes.map(p => p.name), names);
  assert.deepEqual(palettes.filter(p => p.light).map(p => p.name), ["dayfox", "dawnfox"]);
});

for (const palette of palettes) {
  test(`${palette.name}: complete upstream colors and Obsidian role mapping`, () => {
    const v = variables(palette);
    assert.equal(v["--background-primary"], backgrounds[palette.name]);
    assert.equal(v["--text-normal"], palette.palette.fg1);
    assert.equal(v["--text-selection"], palette.palette.sel0);
    assert.equal(v["--code-string"], palette.syntax.string);
    assert.equal(v["--code-comment"], palette.palette.comment);
    assert.ok(Object.keys(v).length >= 130);
    assert.ok(Object.values(v).every(value => typeof value === "string" && value.length > 0));
    for (const value of Object.values(palette.syntax)) assert.match(value, /^#[a-f0-9]{6}$/);
  });
}

test("color operations match upstream rounding and HSV brightening", () => {
  assert.equal(blend("#161616", "#f2f4f8", 0.4), "#6e6f70");
  assert.equal(brighten("#161616", -4), "#0c0c0c");
  assert.equal(brighten("#161616", 6), "#252525");
  assert.equal(brighten("#f2f4f8", 6), "#f9fbff");
  assert.equal(palettes.find(p => p.name === "carbonfox").palette.comment, "#6e6f70");
});

test("parser rejects missing values and unexpected expressions", async () => {
  const source = await readFile(path.join(root, "palettes", "dayfox.lua"), "utf8");
  assert.throws(() => parsePalette(source.replace('bg1     = "#f6f2ee"', "bg1     = unexpected()"), "dayfox"), /Unsupported/);
  assert.throws(() => parsePalette(source, "nightfox"), /name mismatch/);
});

test("stylesheet is self-contained and licensed", async () => {
  const css = await generate();
  assert.equal((css.match(/@font-face/g) || []).length, 6);
  assert.doesNotMatch(css, /url\(["']?https?:|@import|[A-Z]:\\|\/Users\/|\/home\//i);
  assert.match(css, /Copyright \(c\) 2021 James Simpson/);
  assert.match(css, /SIL OPEN FONT LICENSE Version 1\.1/);
  assert.match(css, /body\.theme-light,\nbody\.theme-light\.fox-light-dayfox/);
  assert.match(css, /body\.theme-dark,\nbody\.theme-dark\.fox-dark-nightfox/);
  for (const p of palettes) assert.ok(css.includes(`body.theme-${p.light ? "light" : "dark"}.fox-${p.light ? "light" : "dark"}-${p.name}`));
});

test("Pilotfox layers the captured values over upstream Dayfox", async () => {
  const captured = await loadPilotfox();
  const dayfox = variables(palettes.find(p => p.name === pilotfox.base));
  const css = await generate();
  const block = css.match(/\nbody\.theme-light\.fox-light-pilotfox \{\n([\s\S]*?)\n\}/)?.[1];
  assert.ok(block, "Pilotfox rule is generated");
  const declared = Object.fromEntries(block.split("\n").map(line => line.trim().match(/^(--[a-z0-9-]+): (.*);$/).slice(1)));
  assert.deepEqual(declared, { ...dayfox, ...captured });
  assert.equal(declared["--background-secondary"], "#f1e9e7");
  assert.equal(declared["--text-muted"], "#685887");
  assert.equal(declared["--background-primary"], backgrounds.dayfox);
  assert.match(css, /value: fox-light-pilotfox/);
  assert.match(css, /body\.theme-light\.fox-light-pilotfox button\.mod-cta \{/);
});

test("manifest and package versions agree", async () => {
  const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
  const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  assert.equal(manifest.version, pkg.version);
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  for (const key of ["name", "author", "minAppVersion"]) assert.ok(manifest[key]);
  assert.equal(manifest.name, "Fox Suite");
});
