// Basic CPU and rendering-cost measurement per app state.
//
//   node performance/run.mjs                   spec.performance.states, config.performance.seconds each
//   node performance/run.mjs --seconds 8       shorter samples
//   node performance/run.mjs --only "hourglass running"
//
// CPU is the sum over the app process and every WebView2 process it owns (performance/cpu.ps1), in
// percent of ONE core, over a single sample per state. Per window, Chrome's own counters (layouts,
// style recalcs, script and task time per second) show WHERE the cost is. A state with a `budget`
// fails when it exceeds it: budgets are generous on purpose, they exist to catch a step change
// (an SVG stroke animation once cost about 100% of a core), not to benchmark.
//
// One sample on a busy machine is noisy; treat a failure as "look", and re-run with --seconds 30.
import fs from "node:fs";
import { numberArg } from "../shared/cli.mjs";
import { openRun } from "../shared/run.mjs";

const run = await openRun({ name: "performance" });
const { ctx, config, spec, args } = run;
const seconds = numberArg(args.seconds, config.performance?.seconds ?? 15);
const settleMs = config.performance?.settleMs ?? 2500;
const rows = {};

const rate = (a, b, secs, key, scale = 1) =>
  +(((b[key] - a[key]) * scale) / secs).toFixed(2);
const diff = (a, b, secs) => ({
  layoutPerSec: rate(a, b, secs, "LayoutCount"),
  stylePerSec: rate(a, b, secs, "RecalcStyleCount"),
  scriptMsPerSec: rate(a, b, secs, "ScriptDuration", 1000),
  taskMsPerSec: rate(a, b, secs, "TaskDuration", 1000),
  nodes: b.Nodes,
  heapMB: +(b.JSHeapUsedSize / 1048576).toFixed(1),
});

for (const st of spec.performance.states) {
  if (ctx.only && !ctx.only.includes(st.id)) continue;
  try {
    await st.enter(ctx);
    await ctx.sleep(settleMs);
    const before = {};
    for (const [role, win] of Object.entries(ctx.windows))
      before[role] = await win.performanceMetrics();
    const cpu = ctx.native.cpu(seconds).data;
    const after = {};
    for (const [role, win] of Object.entries(ctx.windows))
      after[role] = await win.performanceMetrics();
    if (!cpu || cpu.error)
      throw new Error(cpu?.error ?? "CPU sampler returned nothing");
    const perWindow = Object.fromEntries(
      Object.keys(before).map((r) => [r, diff(before[r], after[r], seconds)]),
    );
    rows[st.id] = { cpu, windows: perWindow, budget: st.budget ?? null };
    ctx.note(
      `${st.id}: ${cpu.percentOfOneCore}% of one core (${cpu.percentOfAllCores}% of ${cpu.logicalCores} logical cores), ${cpu.processes} processes, ${cpu.seconds}s`,
    );
    for (const [role, d] of Object.entries(perWindow))
      ctx.note(`   ${role}: ${JSON.stringify(d)}`);
    if (st.budget !== undefined)
      ctx.ok(
        `${st.id}: ${cpu.percentOfOneCore}% of one core is within the ${st.budget}% budget`,
        cpu.percentOfOneCore <= st.budget,
      );
  } catch (e) {
    ctx.ok(`${st.id} measured`, false, e.message);
  }
}

fs.writeFileSync(
  ctx.outPath("performance.json"),
  JSON.stringify(rows, null, 2),
);
try {
  await ctx.spec.reset?.(ctx);
} catch {
  /* best effort */
}
await run.close(`sample length: ${seconds}s per state (single sample each)\n`);
