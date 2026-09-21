// Loads and validates an app config (JSON) and resolves every path it names.
//
// A config file describes the APP (identity, windows, sizes, viewports). The
// scenarios that drive it live in a separate spec module (see the README).
// Paths inside a config are relative to the repository root unless they start
// with an environment token such as ${APPDATA}. Nothing machine-specific is
// stored: the repository root is found from the harness location.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const HARNESS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

/** ${NAME} -> process.env.NAME; ${identifier} -> the active identifier. */
export function expandTokens(value, vars = {}) {
  if (typeof value !== "string") return value;
  return value.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (whole, name) => {
    if (name in vars) return vars[name];
    if (process.env[name] !== undefined) return process.env[name];
    return whole; // leave unknown tokens visible so mistakes are obvious
  });
}

const REQUIRED = [
  ["app.name", "string"],
  ["app.identifier", "string"],
  ["app.isolatedIdentifier", "string"],
  ["app.processName", "string"],
  ["cdp.port", "number"],
  ["windows.main.label", "string"],
  ["windows.main.defaultSize", "size"],
];

function getPath(obj, dotted) {
  return dotted
    .split(".")
    .reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function isSize(v) {
  return (
    Array.isArray(v) &&
    v.length === 2 &&
    v.every((n) => Number.isFinite(n) && n > 0)
  );
}

/** Returns a list of human-readable problems (empty when the config is valid). */
export function validateConfig(config) {
  const problems = [];
  for (const [key, type] of REQUIRED) {
    const v = getPath(config, key);
    if (v === undefined) problems.push(`missing "${key}"`);
    else if (type === "size" ? !isSize(v) : typeof v !== type)
      problems.push(
        `"${key}" must be ${type === "size" ? "[width, height]" : type}`,
      );
  }
  if (
    config.app?.identifier &&
    config.app.identifier === config.app.isolatedIdentifier
  )
    problems.push('"app.isolatedIdentifier" must differ from "app.identifier"');
  for (const [role, w] of Object.entries(config.windows ?? {})) {
    if (typeof w.label !== "string" && !w.match)
      problems.push(`windows.${role} needs a "label" or a "match" rule`);
    if (w.minSize !== undefined && !isSize(w.minSize))
      problems.push(`windows.${role}.minSize must be [width, height]`);
    for (const [name, s] of Object.entries(w.sizes ?? {}))
      if (!isSize(s))
        problems.push(`windows.${role}.sizes.${name} must be [w, h]`);
  }
  for (const [i, vp] of (config.viewports ?? []).entries()) {
    if (!vp.name || !Number.isFinite(vp.w) || !Number.isFinite(vp.h))
      problems.push(`viewports[${i}] needs name, w and h`);
  }
  // machine-specific absolute paths do not belong in a portable config
  const abs = /^(?:[A-Za-z]:[\\/]|\\\\|\/(?:Users|home)\/)/;
  (function walk(node, trail) {
    if (typeof node === "string") {
      if (abs.test(node)) problems.push(`${trail}: absolute path "${node}"`);
    } else if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) walk(v, `${trail}.${k}`);
    }
  })(config, "config");
  return problems;
}

/**
 * Load a config file. Returns the parsed JSON plus resolved helpers:
 *   configPath, configDir, repoRoot, specPath, outputDir, port,
 *   repoPath(rel), identifierFor(target)
 */
export function loadConfig(configPath, overrides = {}) {
  const abs = path.resolve(configPath);
  if (!fs.existsSync(abs)) throw new Error(`config not found: ${configPath}`);
  const config = JSON.parse(fs.readFileSync(abs, "utf8"));
  const problems = validateConfig(config);
  if (problems.length)
    throw new Error(
      `invalid config ${configPath}:\n  - ${problems.join("\n  - ")}`,
    );

  const configDir = path.dirname(abs);
  const repoRoot = path.resolve(
    configDir,
    config.repoRoot ??
      path.relative(configDir, path.resolve(HARNESS_DIR, "../../..")),
  );
  const specFile =
    config.specFile ??
    `${path.basename(abs).replace(/\.config\.json$/, "")}.spec.mjs`;
  const resolved = {
    ...config,
    configPath: abs,
    configDir,
    repoRoot,
    specPath: path.resolve(configDir, specFile),
    port: Number(overrides.port ?? process.env.CDP_PORT ?? config.cdp.port),
  };
  resolved.repoPath = (rel) => path.resolve(repoRoot, expandTokens(rel));
  resolved.outputRoot = path.resolve(
    repoRoot,
    expandTokens(config.output?.dir ?? "docs/design/qa-harness/.output"),
  );
  resolved.identifierFor = (target) =>
    target === "release"
      ? config.app.identifier
      : config.app.isolatedIdentifier;
  resolved.stateFileFor = (target) =>
    config.app.stateFile
      ? path.resolve(
          expandTokens(config.app.stateFile, {
            identifier: resolved.identifierFor(target),
          }),
        )
      : null;
  return resolved;
}
