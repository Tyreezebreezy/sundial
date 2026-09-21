// Static "visual noise" audits that need no running app.
//
//   node evidence/static-audit.mjs drift --before-rev <git rev> --before-dir src --after-dir src/styles
//        Stylesheet token drift, old build vs new: raw color literals outside the token file, distinct
//        font sizes / weights / radii, off-rhythm spacing, shadows, gradients, infinite animations.
//   node evidence/static-audit.mjs dead --src src --styles src/styles [--uses tests]
//        Exports nothing imports (tests count as importers), and CSS classes no code references.
//
// Options: --repo <path> (default: the repository this harness lives in)
//          --token-file <name> (default tokens.css)   --space-prefix (default --space-)
//
// These are counts, not verdicts: a number that went up is a question to answer, not a failure.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "../shared/cli.mjs";
import { HARNESS_DIR } from "../shared/config.mjs";

const args = parseArgs(process.argv.slice(2));
const repo = path.resolve(
  String(args.repo ?? path.resolve(HARNESS_DIR, "../../..")),
);
const command = args._[0];
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");
const uniq = (a) => [...new Set(a)];
const count = (css, re) => (css.match(re) || []).length;
const walk = (dir, exts, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== "node_modules") walk(f, exts, out);
    } else if (exts.some((x) => e.name.endsWith(x))) out.push(f);
  }
  return out;
};
const git = (...a) =>
  execFileSync("git", a, { cwd: repo, encoding: "utf8", maxBuffer: 1 << 28 });

function decl(css, prop) {
  const re = new RegExp("(?:^|[;{\\s])" + prop + "\\s*:\\s*([^;}]+)", "g");
  return uniq([...css.matchAll(re)].map((m) => m[1].trim()));
}
const colorRe = /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\([^)]*\)/g;

function drift() {
  const beforeRev = args.beforeRev;
  const beforeDir = args.beforeDir ?? "src";
  const afterDir = path.resolve(repo, String(args.afterDir ?? "src/styles"));
  if (!beforeRev) throw new Error("drift needs --before-rev <git revision>");
  const tokenFile = String(args.tokenFile ?? "tokens.css");
  const spacePrefix = String(args.spacePrefix ?? "--space-");

  const beforeFiles = git(
    "ls-tree",
    "-r",
    "--name-only",
    beforeRev,
    "--",
    beforeDir,
  )
    .split("\n")
    .filter((f) => f.endsWith(".css"));
  const before = strip(
    beforeFiles.map((f) => git("show", `${beforeRev}:${f}`)).join("\n"),
  );
  const afterFiles = walk(afterDir, [".css"]);
  const afterAll = afterFiles.map((f) => strip(fs.readFileSync(f, "utf8")));
  const after = afterAll.join("\n");
  const afterNoTokens = afterFiles
    .map((f, i) => (path.basename(f) === tokenFile ? "" : afterAll[i]))
    .join("\n");
  const tokenText = afterFiles
    .map((f, i) => (path.basename(f) === tokenFile ? afterAll[i] : ""))
    .join("\n");

  // Font sizes come from role tokens: count the distinct sizes those roles resolve to.
  const roleSizes = uniq(
    [...tokenText.matchAll(/--font-[a-z-]+:\s*[0-9]{3}\s+([^\s/]+)/g)].map(
      (m) => m[1],
    ),
  );
  const weights = uniq(
    [...after.matchAll(/--font-[a-z-]+:\s*(\d{3})\b/g)]
      .map((m) => m[1])
      .concat(decl(afterNoTokens, "font-weight")),
  ).sort();
  const offRhythm = (css, stripper) => {
    let n = 0;
    for (const p of ["padding", "margin", "gap"])
      for (const v of decl(css, p)) {
        const rest = stripper(v);
        if (
          /\d+(\.\d+)?(px|rem|em)\b/.test(
            rest.replace(/\b0(px|rem)?\b/g, ""),
          ) &&
          !/^(0|auto)$/.test(v)
        )
          n++;
      }
    return n;
  };
  const spaceVar = new RegExp(
    `var\\(${spacePrefix.replace(/[-]/g, "\\-")}[0-9]+\\)`,
    "g",
  );

  const rows = [
    [
      "CSS lines (non-blank)",
      before.split("\n").filter((l) => l.trim()).length,
      after.split("\n").filter((l) => l.trim()).length,
    ],
    [
      "Raw color literals outside the token file",
      count(before, colorRe),
      count(afterNoTokens, colorRe),
    ],
    [
      "Distinct color values",
      uniq(before.match(colorRe) || []).length,
      uniq(after.match(colorRe) || []).length + " (in the token file)",
    ],
    [
      "Distinct font sizes",
      decl(before, "font-size").length,
      roleSizes.length + " (from named roles)",
    ],
    [
      "Font weights",
      decl(before, "font-weight").join(" / "),
      weights.join(" / "),
    ],
    [
      "Distinct border-radius values",
      decl(before, "border-radius").length,
      decl(afterNoTokens, "border-radius").length,
    ],
    [
      "Spacing declarations off the rhythm",
      offRhythm(before, (v) => v),
      offRhythm(afterNoTokens, (v) => v.replace(spaceVar, "")),
    ],
    [
      "box-shadow declarations",
      count(before, /box-shadow\s*:/g),
      count(afterNoTokens, /box-shadow\s*:/g),
    ],
    [
      "gradient declarations",
      count(before, /gradient\(/g),
      count(afterNoTokens, /gradient\(/g),
    ],
    [
      "Infinite animations",
      count(before, /\binfinite\b/g),
      count(after, /\binfinite\b/g),
    ],
    ["!important", count(before, /!important/g), count(after, /!important/g)],
  ];
  console.log(`| metric | ${beforeRev} | now |\n|---|---|---|`);
  for (const [k, b, a] of rows) console.log(`| ${k} | ${b} | ${a} |`);
}

function dead() {
  const src = path.resolve(repo, String(args.src ?? "src"));
  const styles = path.resolve(repo, String(args.styles ?? "src/styles"));
  const files = walk(src, [".ts", ".tsx", ".mjs"]);
  const text = Object.fromEntries(
    files.map((f) => [f, fs.readFileSync(f, "utf8")]),
  );
  // Tests (and any other listed folders) count as users of an export, but are not scanned for exports.
  const usage = { ...text };
  for (const extra of String(args.uses ?? "tests")
    .split(",")
    .filter(Boolean)) {
    const dir = path.resolve(repo, extra);
    if (fs.existsSync(dir))
      for (const f of walk(dir, [".ts", ".tsx", ".mjs"]))
        usage[f] = fs.readFileSync(f, "utf8");
  }
  const word = (name, flags) => new RegExp("\\b" + name + "\\b", flags);

  const unusedExports = [];
  for (const [f, s] of Object.entries(text)) {
    for (const m of s.matchAll(
      /export\s+(?:async\s+)?(?:function|const|class|type|interface|enum)\s+([A-Za-z0-9_]+)/g,
    )) {
      const name = m[1];
      const usedElsewhere = Object.entries(usage).some(
        ([g, t]) => g !== f && word(name).test(t),
      );
      if (!usedElsewhere) {
        const own = (s.match(word(name, "g")) || []).length;
        unusedExports.push(
          `${path.relative(repo, f).replaceAll("\\", "/")}: ${name}${own > 1 ? " (used only inside its own file: drop the export)" : " (unused)"}`,
        );
      }
    }
  }

  const css = walk(styles, [".css"])
    .map((f) => strip(fs.readFileSync(f, "utf8")))
    .join("\n");
  const code = Object.values(text).join("\n");
  const unusedClasses = [];
  for (const c of uniq(
    [...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]),
  ).sort()) {
    const exact = new RegExp(
      "(^|[^\\w-])" + c.replace(/-/g, "\\-") + "([^\\w-]|$)",
    ).test(code);
    const templated = code.includes(c.replace(/(--|-)[\w-]+$/, "$1") + "${"); // class built like `x--${state}`
    if (!exact && !templated) unusedClasses.push(c);
  }
  console.log(
    unusedExports.length
      ? `exports nothing imports:\n  ${unusedExports.join("\n  ")}`
      : "no unused exports",
  );
  console.log(
    unusedClasses.length
      ? `CSS classes no code references (URL fragments like "org" or "w3" are noise):\n  ${unusedClasses.join("\n  ")}`
      : "no unused CSS classes",
  );
}

if (command === "drift") drift();
else if (command === "dead") dead();
else {
  console.error(
    "usage: static-audit.mjs <drift|dead> [options]   (see the header of this file)",
  );
  process.exit(2);
}
