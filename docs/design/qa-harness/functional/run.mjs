// Functional UI regression runner: drives the REAL UI with real pointer/keyboard input and asserts
// on the app's own engine state (through the IPC bridge), so a passing check means the click
// reached the engine, not just that a label changed.
//
//   node functional/run.mjs                       run every section of the spec
//   node functional/run.mjs --only study-plan,controls
//   node functional/run.mjs --list                list the sections
//
// The spec (config/<app>.spec.mjs) supplies `functional.prepare(ctx)` and `functional.sections[]`.
// Sections run in order and share app state, exactly like a person working through the app.
import { openRun } from "../shared/run.mjs";

const run = await openRun({
  name: "functional",
  needWindows: !process.argv.includes("--list"),
});
const { ctx, spec, args } = run;
const fn = spec.functional;
if (!fn?.sections?.length)
  throw new Error("the spec has no functional.sections");

if (args.list) {
  for (const s of fn.sections)
    console.log(`${s.id.padEnd(22)} ${s.title ?? ""}`);
  process.exit(0);
}

if (fn.prepare && !args.noPrepare) await fn.prepare(ctx);
for (const section of fn.sections) {
  if (ctx.only && !ctx.only.includes(section.id)) continue;
  ctx.section(section.title ?? section.id);
  try {
    await section.run(ctx);
  } catch (e) {
    ctx.ok(`section "${section.id}" ran to the end`, false, e.message);
  }
}
await run.close();
