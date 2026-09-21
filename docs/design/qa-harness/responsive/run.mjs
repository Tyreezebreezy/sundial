// Responsive / window-size QA: every surface at every viewport, checking for horizontal overflow,
// controls leaving the window, clipped text and undersized targets. Screenshots are kept per combination.
//
//   node responsive/run.mjs                               spec surfaces x config viewports
//   node responsive/run.mjs --only settings,timer-setup   a subset of surfaces
//   node responsive/run.mjs --no-shots                    measurements only
//
// Viewport and pixel-ratio EMULATION (Emulation.setDeviceMetricsOverride) stands in for window sizes
// and for OS display scaling; it does not change the real window or the OS scale factor (see README).
import fs from "node:fs";
import { layoutProbe } from "../shared/probes.mjs";
import { openRun } from "../shared/run.mjs";

const run = await openRun({ name: "responsive" });
const { ctx, config, spec, args } = run;
const viewports = config.viewports ?? [];
if (!viewports.length) throw new Error('config has no "viewports"');
const cfg = spec.responsive;
const probeOptions = {
  interactiveSelector:
    config.probes?.interactiveSelector ??
    "button, input:not([type=hidden]), select, textarea, a[href]",
  textSelector: config.probes?.textSelector ?? "",
  truncationSelectors: config.probes?.truncationSelectors ?? [],
  heroSelector: config.probes?.heroSelector ?? null,
  minTargetPx: config.probes?.minTargetPx ?? 24,
  autoClip: config.probes?.autoClip ?? true,
};

// The configured default and minimum window sizes must both be exercised.
const has = (size) =>
  viewports.some((v) => v.w === size[0] && v.h === size[1] && v.dpr === 1);
ctx.ok(
  "viewports include the default window size",
  has(config.windows.main.defaultSize),
);
if (config.windows.main.minSize)
  ctx.ok(
    "viewports include the minimum window size",
    has(config.windows.main.minSize),
  );

const results = {};
const scrolls = [];
for (const id of cfg.surfaces) {
  if (ctx.only && !ctx.only.includes(id)) continue;
  ctx.section(id);
  try {
    await ctx.enter(id);
    await ctx.sleep(700);
    for (const vp of viewports) {
      await ctx.main.viewport(vp.w, vp.h, vp.dpr ?? 1);
      await ctx.sleep(350);
      const m = await ctx.main.probe(layoutProbe, probeOptions);
      results[`${id} @ ${vp.name}`] = m;
      if (!args.noShots)
        await ctx.main.shot(ctx.outPath(`${id}__${vp.name}.png`));
      const flags = [];
      if (m.hOverflow) flags.push("H-OVERFLOW");
      if (m.offEdge.length) flags.push(`OFF-EDGE:${m.offEdge.join("|")}`);
      if (m.truncated.length) flags.push(`TRUNCATED:${m.truncated.join("|")}`);
      if (m.smallTargets.length)
        flags.push(`SMALL-TARGET:${m.smallTargets.join("|")}`);
      ctx.ok(`${id} @ ${vp.name}`, flags.length === 0, flags.join(" "));
      if (m.vScroll) scrolls.push(`${id} @ ${vp.name}`);
    }
  } catch (e) {
    ctx.ok(`${id} ran at every viewport`, false, e.message);
  } finally {
    await ctx.main.clearViewport().catch(() => {});
  }
}

fs.writeFileSync(
  ctx.outPath("responsive.json"),
  JSON.stringify(results, null, 2),
);
const design = new Set(cfg.scrollsByDesign ?? []);
const unexpected = scrolls.filter(
  (s) => !design.has(s.split(" @ ")[0]) && !/zoom200/.test(s),
);
ctx.note(`${Object.keys(results).length} surface/viewport combinations`);
ctx.note(`vertical scroll (informational): ${scrolls.join("; ") || "none"}`);
ctx.ok(
  "no surface needs vertical scrolling unless it is expanded on purpose (or at 200% zoom)",
  unexpected.length === 0,
  unexpected.join("; "),
);
await run.close();
