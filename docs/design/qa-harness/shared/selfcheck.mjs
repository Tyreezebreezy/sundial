// Deterministic self-check of the harness. Needs no app and no display: it proves the
// configuration and spec are well formed and internally consistent, that the code injected into the
// page still compiles, that the PowerShell scripts parse, and that nothing machine-specific or secret
// has crept into the folder.
//
//   node shared/selfcheck.mjs                          check every config in config/ and its spec
//   node shared/selfcheck.mjs --config config/x.config.json
//
// Exit code 1 when any check fails.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { listArg, parseArgs } from "./cli.mjs";
import {
  HARNESS_DIR,
  expandTokens,
  loadConfig,
  validateConfig,
} from "./config.mjs";
import * as probes from "./probes.mjs";
import { Recorder } from "./results.mjs";

const args = parseArgs(process.argv.slice(2));
const rec = new Recorder();
const { ok } = rec;
const check = ok.bind(rec);

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === ".output" || e.name === "node_modules") continue;
    const f = path.join(dir, e.name);
    e.isDirectory() ? walk(f, out) : out.push(f);
  }
  return out;
};
const files = walk(HARNESS_DIR);

// ---- pure helpers ---------------------------------------------------------------------------------
rec.section("helpers");
const parsed = parseArgs([
  "positional",
  "--out",
  "dir",
  "--only=a,b",
  "--flag",
]);
check(
  "parseArgs handles positional, value, =value and trailing flag forms",
  parsed.out === "dir" &&
    parsed.only === "a,b" &&
    parsed.flag === true &&
    parsed._[0] === "positional",
);
check(
  "listArg splits and trims",
  JSON.stringify(listArg("a, b ,c")) === '["a","b","c"]' &&
    listArg(true) === null,
);
check(
  "expandTokens fills known tokens and leaves unknown ones visible",
  expandTokens("${identifier}/x", { identifier: "id" }) === "id/x" &&
    expandTokens("${NO_SUCH_TOKEN_QA}") === "${NO_SUCH_TOKEN_QA}",
);
const probe = new Recorder({ quiet: true });
probe.ok("a", true);
probe.ok("b", false, "why");
check(
  "Recorder counts passes and failures",
  probe.pass === 1 &&
    probe.fail === 1 &&
    probe.exitCode === 1 &&
    probe.lines[1].includes("<-- why"),
);

// ---- code injected into the page must compile ---------------------------------------------------------
rec.section("page-side probes");
for (const [name, fn] of Object.entries(probes)) {
  let compiled = false;
  try {
    compiled =
      typeof new Function(`return (${fn.toString()})`)() === "function";
  } catch {
    /* reported below */
  }
  check(`probe ${name} compiles as a self-contained function`, compiled);
}

// ---- configs and specs ------------------------------------------------------------------------------------
const configDir = path.join(HARNESS_DIR, "config");
const configs = args.config
  ? [path.resolve(String(args.config))]
  : fs
      .readdirSync(configDir)
      .filter((f) => f.endsWith(".config.json"))
      .map((f) => path.join(configDir, f));

for (const file of configs) {
  const base = path.basename(file);
  const isTemplate = base.startsWith("template");
  rec.section(`config: ${base}`);
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const problems = validateConfig(raw);
  check(
    `${base} is valid and portable (no absolute machine paths)`,
    problems.length === 0,
    problems.join("; "),
  );
  if (problems.length) continue;
  const config = loadConfig(file);
  check(
    "the repository root resolves to a folder with a .git entry",
    isTemplate || fs.existsSync(path.join(config.repoRoot, ".git")),
    config.repoRoot,
  );
  const w = config.windows.main;
  const has = (s) =>
    (config.viewports ?? []).some(
      (v) => v.w === s[0] && v.h === s[1] && (v.dpr ?? 1) === 1,
    );
  check("viewports include the default window size", has(w.defaultSize));
  if (w.minSize)
    check("viewports include the minimum window size", has(w.minSize));
  check(
    "the isolated identifier cannot be the real one",
    config.app.isolatedIdentifier !== config.app.identifier &&
      config.app.isolatedIdentifier.startsWith(config.app.identifier),
  );
  if (config.app.stateFile)
    check(
      "the state file path is under the app identifier",
      expandTokens(config.app.stateFile, { identifier: "ID" }).includes("/ID/"),
    );
  check(
    "the spec file exists",
    fs.existsSync(config.specPath),
    config.specPath,
  );
  if (!fs.existsSync(config.specPath)) continue;

  const spec = (await import(pathToFileURL(config.specPath).href)).default;
  const surfaces = spec.surfaces ?? {};
  check(
    "every surface has an enter() and a known window",
    Object.entries(surfaces).every(
      ([, s]) =>
        typeof s.enter === "function" && config.windows[s.window ?? "main"],
    ),
  );
  const known = (ids) => ids.filter((id) => !surfaces[id]);
  const refs = {
    "capture.main": (spec.capture?.main ?? []).map((e) => e.surface),
    "responsive.surfaces": spec.responsive?.surfaces ?? [],
    "accessibility.surfaces": (spec.accessibility?.surfaces ?? []).map(
      (e) => e.surface,
    ),
    "accessibility.keyboard": (spec.accessibility?.keyboard ?? []).map(
      (e) => e.surface,
    ),
  };
  for (const [where, ids] of Object.entries(refs))
    check(
      `${where} reference only defined surfaces`,
      known(ids).length === 0,
      known(ids).join(","),
    );
  const names = (spec.capture?.main ?? []).map((e) => e.name);
  check("capture names are unique", new Set(names).size === names.length);
  check(
    "performance states each have an id and enter()",
    (spec.performance?.states ?? []).every(
      (s) => s.id && typeof s.enter === "function",
    ),
  );
  if (spec.performance?.defect)
    check(
      "performance.defect names an existing state and carries CSS",
      (spec.performance.states ?? []).some(
        (s) => s.id === spec.performance.defect.state,
      ) && typeof spec.performance.defect.css === "string",
    );
  const sections = spec.functional?.sections ?? [];
  check(
    "functional sections have unique ids and run()",
    new Set(sections.map((s) => s.id)).size === sections.length &&
      sections.every((s) => typeof s.run === "function"),
  );

  if (spec.widget) {
    const ws = spec.widget;
    const sizes = config.windows.widget?.sizes ?? {};
    check(
      "widget sizes are all declared in the config",
      ws.sizes.every((s) => sizes[s]),
    );
    check(
      "every widget matrix row names a defined state",
      ws.matrix.every((r) => typeof ws.states[r.state] === "function"),
    );
    check("the widget has setSize()", typeof ws.setSize === "function");
  }
  if (spec.lifecycle) {
    const lc = spec.lifecycle;
    check(
      "lifecycle scenarios have an id, a known expectation and a trigger",
      (lc.scenarios ?? []).every(
        (s) =>
          s.id &&
          ["exit", "keep-running"].includes(s.expect) &&
          (typeof s.trigger === "function" || s.win32),
      ),
    );
    if (lc.restore) {
      const keys = Object.keys(lc.restore.expect ?? {});
      check(
        "restore states have craft()/observe() and expectations only for listed states",
        typeof lc.restore.craft === "function" &&
          typeof lc.restore.observe === "function" &&
          keys.every((k) => lc.restore.states.includes(k)),
      );
    }
  }
}

// ---- PowerShell scripts ----------------------------------------------------------------------------------------
rec.section("PowerShell scripts");
const ps1 = files.filter((f) => f.endsWith(".ps1"));
for (const f of ps1) {
  const bytes = fs.readFileSync(f);
  check(
    `${path.relative(HARNESS_DIR, f)} is ASCII (Windows PowerShell 5.1 reads BOM-less files as ANSI)`,
    bytes.every((b) => b < 128),
  );
}
const parse = spawnSync(
  "powershell",
  [
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    `$bad = 0; foreach ($f in @(${ps1.map((f) => `'${f}'`).join(",")})) { $e = $null; [void][System.Management.Automation.Language.Parser]::ParseFile($f, [ref]$null, [ref]$e); if ($e) { $bad++; $e | ForEach-Object { Write-Output ($f + ': ' + $_.Message) } } }; Write-Output "PARSE_ERRORS=$bad"`,
  ],
  { encoding: "utf8" },
);
if (parse.error)
  rec.note("PowerShell not available here; script syntax not checked");
else
  check(
    "every .ps1 parses without syntax errors",
    /PARSE_ERRORS=0/.test(parse.stdout),
    parse.stdout.trim().split("\n").slice(0, 3).join(" | "),
  );

// ---- hygiene ------------------------------------------------------------------------------------------------------
rec.section("hygiene");
const text = files.filter(
  (f) =>
    /\.(mjs|json|md|ps1)$/.test(f) &&
    path.resolve(f) !== path.resolve(import.meta.filename ?? ""),
);
const patterns = [
  [
    "machine-specific absolute paths",
    /[A-Za-z]:[\\/](?:Users|Dev|Windows)[\\/]|\/Users\/[a-z]|AppData[\\/](?:Local|Roaming)[\\/](?:Temp|Claude)/i,
  ],
  [
    "credentials or tokens",
    /password\s*=|Authorization:\s*token|api[_-]?key\s*[:=]\s*\S{8,}|BEGIN (?:RSA |OPENSSH )?PRIVATE KEY/i,
  ],
];
for (const [label, re] of patterns) {
  const hits = text
    .filter((f) => re.test(fs.readFileSync(f, "utf8")))
    .map((f) => path.relative(HARNESS_DIR, f));
  check(`no ${label} in the harness files`, hits.length === 0, hits.join(", "));
}
check(
  "no generated output, logs or screenshots inside the harness folder",
  files.every((f) => !/\.(log|png|pid)$/i.test(f)),
  files
    .filter((f) => /\.(log|png|pid)$/i.test(f))
    .map((f) => path.relative(HARNESS_DIR, f))
    .join(", "),
);

console.log(`\n${rec.summary}`);
process.exit(rec.exitCode);
