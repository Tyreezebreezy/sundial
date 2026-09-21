// Deterministic design-system gate. Only claims that can be measured or
// statically identified are made here (visual judgment lives in the QA
// evidence under docs/design). Rule ids follow the Forge ui-design detectors.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(root, "src");

function walk(dir, exts, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, exts, out);
    else if (exts.some((e) => entry.name.endsWith(e))) out.push(full);
  }
  return out;
}

const rel = (f) => path.relative(root, f).replaceAll("\\", "/");
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");

const tokensFile = path.join(srcDir, "styles", "tokens.css");
const tokensCss = stripComments(fs.readFileSync(tokensFile, "utf8"));
const tokens = Object.fromEntries(
  [...tokensCss.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)].map((m) => [
    m[1],
    m[2].trim(),
  ]),
);

const cssFiles = walk(path.join(srcDir, "styles"), [".css"]).filter(
  (f) => f !== tokensFile,
);
const tsxFiles = walk(srcDir, [".tsx", ".ts"]);

// ---- WCAG contrast ------------------------------------------------------
function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
const color = (name) => {
  const v = tokens[`--color-${name}`];
  assert.ok(v, `missing token --color-${name}`);
  const resolved = v.startsWith("var(")
    ? tokens[v.match(/var\((--[a-z0-9-]+)\)/)[1]]
    : v;
  assert.match(
    resolved,
    /^#[0-9a-f]{6}$/i,
    `--color-${name} must be a hex value`,
  );
  return resolved;
};

test("UI-TOKEN: every role required by the design contract exists", () => {
  const required = [
    "--color-canvas",
    "--color-surface-1",
    "--color-surface-2",
    "--color-text-primary",
    "--color-text-secondary",
    "--color-text-muted",
    "--color-accent",
    "--color-accent-bright",
    "--color-accent-deep",
    "--color-divider",
    "--color-danger",
    "--space-1",
    "--space-2",
    "--space-3",
    "--space-4",
    "--space-5",
    "--space-6",
    "--space-7",
    "--space-8",
    "--radius-sm",
    "--radius-md",
    "--radius-lg",
    "--font-timer-xl",
    "--font-timer-widget",
    "--font-display",
    "--font-heading",
    "--font-body",
    "--font-meta",
    "--motion-fast",
    "--motion-standard",
    "--motion-state",
  ];
  for (const name of required) assert.ok(tokens[name], `missing ${name}`);
});

test("UI-COLOR-002: text roles meet WCAG AA (4.5:1) on every surface they sit on", () => {
  const surfaces = ["canvas", "surface-1", "surface-2"];
  for (const text of [
    "text-primary",
    "text-secondary",
    "text-muted",
    "accent",
    "danger",
  ]) {
    for (const surface of surfaces) {
      const ratio = contrast(color(text), color(surface));
      assert.ok(
        ratio >= 4.5,
        `${text} on ${surface} is ${ratio.toFixed(2)}:1 (needs >= 4.5)`,
      );
    }
  }
  const onAccent = contrast(color("on-accent"), color("accent"));
  assert.ok(onAccent >= 4.5, `on-accent on accent is ${onAccent.toFixed(2)}:1`);
});

test("UI-COLOR-002: control boundaries and the focus ring meet 3:1 non-text contrast", () => {
  for (const surface of ["canvas", "surface-1", "surface-2"]) {
    const border = contrast(color("border-control"), color(surface));
    assert.ok(
      border >= 3,
      `border-control on ${surface} is ${border.toFixed(2)}:1`,
    );
    const focus = contrast(color("focus"), color(surface));
    assert.ok(focus >= 3, `focus on ${surface} is ${focus.toFixed(2)}:1`);
  }
});

test("UI-COLOR-003: no raw color values outside tokens.css", () => {
  const raw =
    /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch)\(/;
  const offenders = [];
  for (const file of [...cssFiles, ...tsxFiles]) {
    const text = stripComments(fs.readFileSync(file, "utf8"));
    text.split("\n").forEach((line, i) => {
      if (raw.test(line))
        offenders.push(`${rel(file)}:${i + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(offenders, [], "use a --color-* token instead");
});

function declarations(css, property) {
  const out = [];
  const re = new RegExp(`(?:^|[;{\\s])${property}\\s*:\\s*([^;}]+)`, "g");
  for (const m of css.matchAll(re)) out.push(m[1].trim());
  return out;
}

test("UI-TYPE-003: type sizes come from font role tokens", () => {
  const offenders = [];
  for (const file of cssFiles) {
    const css = stripComments(fs.readFileSync(file, "utf8"));
    for (const v of declarations(css, "font-size")) {
      if (!/^(inherit|initial|unset|100%)$/.test(v) && !v.includes("var(--"))
        offenders.push(`${rel(file)}: font-size: ${v}`);
    }
    for (const v of declarations(css, "font")) {
      if (
        !/^(inherit|initial|unset)$/.test(v) &&
        !/^var\(--font-[a-z-]+\)$/.test(v)
      )
        offenders.push(`${rel(file)}: font: ${v}`);
    }
    for (const v of declarations(css, "font-weight")) {
      if (!/^(300|400|600|inherit|normal)$/.test(v))
        offenders.push(
          `${rel(file)}: font-weight: ${v} (budget is 300/400/600)`,
        );
    }
  }
  assert.deepEqual(offenders, []);
});

test("UI-SPACE-001: spacing comes from the 4/8/12/16/24/32/48/64 rhythm", () => {
  const offenders = [];
  for (const file of cssFiles) {
    const css = stripComments(fs.readFileSync(file, "utf8"));
    for (const prop of ["padding", "margin", "gap", "row-gap", "column-gap"]) {
      for (const v of declarations(css, prop)) {
        const rest = v.replace(/var\(--space-[1-8]\)/g, "");
        if (/\d+(\.\d+)?(px|rem|em|vw|vh|vmin|dvh|ch)\b/.test(rest))
          offenders.push(`${rel(file)}: ${prop}: ${v}`);
      }
    }
  }
  assert.deepEqual(offenders, []);
});

test("UI-TOKEN-003: radii and motion durations come from tokens", () => {
  const offenders = [];
  for (const file of cssFiles) {
    const css = stripComments(fs.readFileSync(file, "utf8"));
    for (const v of declarations(css, "border-radius")) {
      const rest = v.replace(/var\(--radius-[a-z]+\)/g, "");
      if (/\d/.test(rest.replace(/\b(50|0)%?\b/g, "")))
        offenders.push(`${rel(file)}: border-radius: ${v}`);
    }
    for (const prop of [
      "transition",
      "animation",
      "transition-duration",
      "animation-duration",
    ]) {
      for (const v of declarations(css, prop)) {
        const rest = v.replace(/var\(--motion-[a-z]+\)/g, "");
        if (/\b\d*\.?\d+m?s\b/.test(rest) && !/^0s?$/.test(rest.trim()))
          offenders.push(`${rel(file)}: ${prop}: ${v}`);
      }
    }
  }
  assert.deepEqual(offenders, []);
});

test("UI-MOTION-004/005: no infinite animation loops; reduced motion is handled", () => {
  let loops = 0;
  let reducedMotionGuard = false;
  for (const file of cssFiles) {
    const css = stripComments(fs.readFileSync(file, "utf8"));
    loops += (css.match(/\binfinite\b/g) || []).length;
    if (/prefers-reduced-motion:\s*reduce/.test(css)) reducedMotionGuard = true;
  }
  assert.ok(reducedMotionGuard, "prefers-reduced-motion handling is required");
  // A looping animation forces continuous frames in every window (measured
  // at ~50% of a CPU core for a decorative stream). Motion here is
  // state-driven: it happens when something changes, never on a loop.
  assert.equal(
    loops,
    0,
    `infinite animation found (${loops}); drive it from the timer tick instead`,
  );
});

test("timer numerals are tabular", () => {
  const all = cssFiles
    .map((f) => stripComments(fs.readFileSync(f, "utf8")))
    .join("\n");
  assert.match(all, /font-variant-numeric:\s*tabular-nums/);
});
