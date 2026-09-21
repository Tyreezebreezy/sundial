// Bootstrap shared by every runner: load the config and spec, refuse to drive an instance that
// uses real user data, discover the app windows, and hand the runner a ready context.
//
//   const run = await openRun({ name: "responsive" });
//   const { ctx } = run;            // ctx.main, ctx.widget, ctx.ok(...), ctx.spec, ctx.config ...
//   ...
//   await run.close();              // writes results, closes sessions, restores real data
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { listArg, numberArg, parseArgs } from "./cli.mjs";
import { HARNESS_DIR, loadConfig } from "./config.mjs";
import {
  Session,
  listTargets,
  sleep,
  tauriLabel,
  waitForTargets,
} from "./cdp.mjs";
import { native } from "./native.mjs";
import { Recorder } from "./results.mjs";
import { Win } from "./win.mjs";

export const DEFAULT_CONFIG = path.join(
  HARNESS_DIR,
  "config",
  "sundial.config.json",
);

// A runner that cannot start (no instance, unsafe target, bad config) should say why, not dump a stack.
process.on("unhandledRejection", (error) => {
  console.error(`\nqa-harness: ${error?.message ?? error}`);
  process.exit(2);
});

export async function loadSpec(config) {
  if (!fs.existsSync(config.specPath))
    throw new Error(
      `spec not found: ${config.specPath} (set "specFile" in the config)`,
    );
  const mod = await import(pathToFileURL(config.specPath).href);
  return mod.default;
}

/**
 * Connect to every app window the config names. Required windows must appear
 * (the widget of a tray app can take a few seconds); optional ones may be absent.
 */
export async function connectWindows(config, { timeoutMs = 60_000 } = {}) {
  const roles = Object.entries(config.windows);
  const required = roles.filter(([, w]) => !w.optional).map(([role]) => role);
  const deadline = Date.now() + timeoutMs;
  let found = {};
  let seen = [];
  await waitForTargets(config.port, { min: required.length, timeoutMs });
  while (Date.now() < deadline) {
    const targets = await listTargets(config.port);
    for (const s of Object.values(found)) s.session.close();
    found = {};
    seen = [];
    for (const target of targets) {
      const session = await Session.open(target);
      const label = await tauriLabel(session);
      seen.push(`${label ?? "(not a Tauri window)"} <${target.url}>`);
      const role = roles.find(([, w]) => {
        if (w.label && label === w.label) return true;
        const m = w.match;
        return Boolean(
          m &&
          (!m.urlIncludes || target.url.includes(m.urlIncludes)) &&
          (!m.titleIncludes || (target.title ?? "").includes(m.titleIncludes)),
        );
      });
      if (role && !found[role[0]])
        found[role[0]] = { session, label: label ?? role[1].label };
      else session.close();
    }
    if (required.every((r) => found[r])) {
      return Object.fromEntries(
        Object.entries(found).map(([role, f]) => [
          role,
          new Win(f.session, role, f.label),
        ]),
      );
    }
    await sleep(1000);
  }
  for (const s of Object.values(found)) s.session.close();
  throw new Error(
    `required window(s) not found: ${required.filter((r) => !found[r]).join(", ")}. ` +
      `Pages seen: ${seen.join("; ") || "none"}. Check "windows" in the config.`,
  );
}

/** The object every spec function receives. Rebuilt per launch by runners that restart the app. */
export function buildContext({
  args,
  config,
  spec,
  out,
  rec,
  nat,
  instance = null,
  windows = {},
}) {
  const ctx = {
    args,
    config,
    spec,
    out,
    rec,
    native: nat,
    instance,
    windows,
    main: windows.main ?? null,
    widget: windows.widget ?? null,
    sleep,
    ok: rec.ok.bind(rec),
    note: rec.note.bind(rec),
    section: rec.section.bind(rec),
    only: listArg(args.only),
    /** Put the app in a named surface from the spec (surfaces are independent of each other). */
    async enter(id) {
      const surface = spec.surfaces?.[id];
      if (!surface) throw new Error(`spec has no surface "${id}"`);
      await surface.enter(ctx);
      return surface;
    },
    /** Absolute path inside this run's output directory. */
    outPath: (...parts) => path.join(out, ...parts),
    /** Every uncaught page exception seen in any window since connecting. */
    exceptions: () =>
      Object.values(windows).flatMap((w) =>
        w.exceptions.map((e) => `${w.role}: ${e}`),
      ),
  };
  return ctx;
}

export async function openRun({
  name,
  mutates = true,
  needWindows = true,
} = {}) {
  const args = parseArgs(process.argv.slice(2));
  const configPath = args.config ?? process.env.QA_CONFIG ?? DEFAULT_CONFIG;
  const config = loadConfig(configPath, { port: args.port });
  const spec = await loadSpec(config);
  const out = args.out
    ? path.resolve(String(args.out))
    : path.join(config.outputRoot, name);
  fs.mkdirSync(out, { recursive: true });
  const rec = new Recorder();
  const nat = native(config);

  // ---- safety: which app data does the instance on this port use? -------------------------------
  let instance = null;
  let realDataBackedUp = false;
  if (needWindows) {
    await waitForTargets(config.port, {
      min: 1,
      timeoutMs: numberArg(args.wait, 60) * 1000,
    });
    instance = nat.instance("inspect").data;
    const isolated = instance?.isolated;
    if (mutates && isolated !== true) {
      const why =
        isolated === false
          ? `the instance on port ${config.port} uses the REAL app data (identifier "${instance.identifier}")`
          : "could not verify which app data the instance uses";
      if (!args.allowRealData) {
        throw new Error(
          `${why}. Runners drive the app (start sessions, change settings), so refusing.\n` +
            `Start an isolated instance:  powershell -File native/instance.ps1 -Action start-dev -Config <config>\n` +
            `or pass --allow-real-data to accept the risk (the state file is backed up and restored).`,
        );
      }
      const b = nat.instance("backup-state", { Target: "release" }).data;
      realDataBackedUp = Boolean(b?.backedUp);
      console.warn(
        `!! --allow-real-data: driving real user data. State backup: ${realDataBackedUp ? b.backup : "none (no state file found)"}`,
      );
    }
  }

  const windows = needWindows
    ? await connectWindows(config, {
        timeoutMs: numberArg(args.wait, 60) * 1000,
      })
    : {};
  const ctx = buildContext({
    args,
    config,
    spec,
    out,
    rec,
    nat,
    instance,
    windows,
  });

  return {
    ctx,
    args,
    config,
    spec,
    out,
    rec,
    async close(extraText = "") {
      const problems = ctx.exceptions();
      if (needWindows)
        rec.note(
          `uncaught page exceptions: ${problems.length}${problems.length ? " -> " + problems.slice(0, 3).join(" | ") : ""}`,
        );
      const file = rec.write(out, "results.txt", extraText);
      console.log(
        `\n${rec.summary}  (details: ${path.relative(process.cwd(), file)})`,
      );
      for (const w of Object.values(windows)) w.session.close();
      if (realDataBackedUp) {
        const r = nat.instance("restore-state", { Target: "release" }).data;
        console.log(
          r?.unchanged
            ? "real state file unchanged (hash matches the backup)"
            : r?.restored
              ? "real state file differed after the run; restored from backup"
              : "state restore: nothing to do",
        );
      }
      process.exit(
        rec.exitCode || (args.failOnExceptions && problems.length ? 1 : 0),
      );
    },
  };
}
