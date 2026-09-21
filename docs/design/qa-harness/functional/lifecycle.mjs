// Lifecycle QA: launch, quit and restore - the parts a page-level test cannot see.
//
// Native (Win32/process) checks:  after a quit path, is the process really gone, together with its
//   WebView2 processes? After closing the main window with "keep running", does the process survive
//   with only the expected windows visible? Windows are closed the way the OS closes them (WM_CLOSE).
// Restore checks: write a persisted session into the (stopped) app's state file, cold-start the app,
//   and assert what the person sees - never a stale running timer for a session that has ended.
//
//   node functional/lifecycle.mjs                        isolated dev instance (safe default)
//   node functional/lifecycle.mjs --only settings-quit,restore-paused
//   node functional/lifecycle.mjs --skip-restore
//   node functional/lifecycle.mjs --target release --allow-real-data
//        drives the built release binary with the REAL app identifier: the state file is backed up first
//        and restored afterwards, but only use it when you are sure nothing else is using the app.
//
// Not covered (needs a person and a real desktop): the tray menu itself (a native shell UI that neither
// CDP nor a window message can reach), and real sleep/wake.
import fs from "node:fs";
import { numberArg } from "../shared/cli.mjs";
import { buildContext, connectWindows, openRun } from "../shared/run.mjs";

const run = await openRun({ name: "lifecycle", needWindows: false });
const { config, spec, rec, args, out } = run;
const nat = run.ctx.native;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lc = spec.lifecycle;
if (!lc) throw new Error("the spec has no lifecycle section");

const target = args.target === "release" ? "release" : "dev";
if (target === "release" && !args.allowRealData)
  throw new Error(
    "--target release uses the real app data; add --allow-real-data to confirm (the state file is backed up and restored)",
  );
const wanted = (id) => !run.ctx.only || run.ctx.only.includes(id);
const settleMs = lc.settleMs ?? 4000;

const launch = () => {
  const r = nat.instance(target === "release" ? "start-release" : "start-dev", {
    AllowRealData: target === "release",
  });
  if (!r.data?.started)
    throw new Error(`launch failed: ${r.stderr || JSON.stringify(r.data)}`);
};
const stop = () =>
  nat.instance(target === "release" ? "stop-release" : "stop-dev");
const inspect = () => nat.instance("inspect", { Target: target }).data ?? {};
const openContext = async () => {
  const windows = await connectWindows(config, { timeoutMs: 90_000 });
  return {
    windows,
    ctx: buildContext({ args, config, spec, out, rec, nat, windows }),
  };
};
const closeContext = (c) =>
  Object.values(c.windows).forEach((w) => w.session.close());

/** Poll until the process (and its WebView2 processes) are gone, or the settle time passes. */
async function waitForExit() {
  const deadline = Date.now() + settleMs + 4000;
  let info = inspect();
  while (
    Date.now() < deadline &&
    (info.running || info.targetWebviewProcesses > 0)
  ) {
    await sleep(500);
    info = inspect();
  }
  return info;
}

let backup = null;
if (target === "release")
  backup = nat.instance("backup-state", { Target: "release" }).data;

try {
  // ---- quit paths ---------------------------------------------------------------------------------
  for (const sc of lc.scenarios ?? []) {
    if (!wanted(sc.id)) continue;
    rec.section(sc.title ?? sc.id);
    let c = null;
    try {
      stop();
      await sleep(1500);
      launch();
      c = await openContext();
      await c.ctx.spec.reset?.(c.ctx);
      await sc.prepare?.(c.ctx);
      if (sc.win32) {
        const r = nat.win32(sc.win32).data;
        rec.ok(
          `${sc.id}: OS accepted the ${sc.win32} request`,
          r?.closed === true,
          JSON.stringify(r),
        );
      } else {
        await sc.trigger(c.ctx);
      }
      await sleep(sc.expect === "exit" ? 500 : settleMs);

      if (sc.expect === "exit") {
        const info = await waitForExit();
        rec.ok(
          `${sc.id}: the app process is gone`,
          !info.running,
          `pids ${info.appPids}`,
        );
        rec.ok(
          `${sc.id}: its WebView2 processes are gone`,
          info.targetWebviewProcesses === 0,
          `${info.targetWebviewProcesses} left`,
        );
      } else {
        const info = inspect();
        const wins = nat.win32("windows").data?.windows ?? [];
        rec.ok(`${sc.id}: the app keeps running`, info.running === true);
        if (sc.visibleWindows !== undefined)
          rec.ok(
            `${sc.id}: ${sc.visibleWindows} window(s) remain visible`,
            wins.length === sc.visibleWindows,
            JSON.stringify(wins.map((w) => `${w.width}x${w.height}`)),
          );
        if (sc.then) {
          await sc.then(c.ctx);
          const after = await waitForExit();
          rec.ok(
            `${sc.id}: then quits cleanly (process and WebView2 processes gone)`,
            !after.running && after.targetWebviewProcesses === 0,
            JSON.stringify(after),
          );
        }
      }
    } catch (e) {
      rec.ok(`${sc.id} ran`, false, e.message);
    } finally {
      if (c) closeContext(c);
      stop();
    }
  }

  // ---- restore --------------------------------------------------------------------------------------
  const restore = lc.restore;
  const stateFile = config.stateFileFor(target);
  if (restore && !args.skipRestore && stateFile) {
    if (!fs.existsSync(stateFile)) {
      // A brand-new isolated profile has no state file until the app has saved once.
      stop();
      launch();
      const c = await openContext();
      await c.ctx.spec.reset?.(c.ctx);
      await sleep(1000);
      closeContext(c);
      stop();
      await sleep(1500);
    }
    for (const name of restore.states) {
      const id = `restore-${name}`;
      if (!wanted(id)) continue;
      rec.section(`restore: ${name}`);
      let c = null;
      try {
        stop();
        await sleep(2500);
        restore.craft({ name, stateFile, fs });
        launch();
        c = await openContext();
        await sleep(3500);
        const observed = await restore.observe(c.ctx);
        const good = restore.expect?.[name]?.(observed);
        rec.ok(
          `${id}: ${good === undefined ? "recorded" : "shows the right thing"}`,
          good !== false,
          JSON.stringify(observed),
        );
        rec.note(JSON.stringify(observed));
        if (!args.noShots)
          await c.ctx.main.shot(c.ctx.outPath(`${id}.png`), {
            width: config.windows.main.defaultSize[0],
            height: config.windows.main.defaultSize[1],
          });
      } catch (e) {
        rec.ok(`${id} ran`, false, e.message);
      } finally {
        if (c) closeContext(c);
      }
    }
  }
} finally {
  stop();
  if (backup) {
    const r = nat.instance("restore-state", { Target: "release" }).data;
    console.log(
      r?.unchanged
        ? "real state file unchanged (hash matches the backup)"
        : r?.restored
          ? "real state file differed; restored from backup"
          : "state restore: nothing to do",
    );
  }
}
await run.close(`target: ${target}, settle ${numberArg(settleMs, 4000)} ms\n`);
