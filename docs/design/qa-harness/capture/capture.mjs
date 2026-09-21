// Evidence capture: every main-window surface at a fixed size, and every widget state at every size.
//
// The same driver captures a BASELINE (run it against the old build with a spec whose surface ids
// match) and the AFTER set (run it against the new build), so before/after boards pair one to one.
//
//   node capture/capture.mjs --out docs/design/v1.2.0            intentional evidence -> committed
//   node capture/capture.mjs                                     scratch run -> .output/capture (ignored)
//   node capture/capture.mjs --only 01-study-setup,widget-small-study
//   node capture/capture.mjs --main-only | --widget-only
//
// Writes <name>.png per capture plus metrics.json (scroll size, control census, pixel ratio).
import fs from "node:fs";
import { censusProbe } from "../shared/probes.mjs";
import { openRun } from "../shared/run.mjs";

const run = await openRun({ name: "capture" });
const { ctx, config, spec } = run;
const wanted = (name) => !ctx.only || ctx.only.includes(name);
const metrics = {};
const [defaultW, defaultH] = config.windows.main.defaultSize;
const interactive =
  config.probes?.interactiveSelector ??
  "button, input:not([type=hidden]), select, textarea, a[href], summary, [role=button], [role=tab], [role=switch], [role=radio]";

async function saved(name, file) {
  const size = fs.existsSync(file) ? fs.statSync(file).size : 0;
  ctx.ok(`captured ${name}`, size > 1000, `empty or missing: ${file}`);
}

// ---- main window ----------------------------------------------------------------------------
if (!ctx.args.widgetOnly) {
  ctx.section("main window");
  for (const entry of spec.capture.main) {
    if (!wanted(entry.name)) continue;
    try {
      await ctx.enter(entry.surface);
      await ctx.sleep(entry.wait ?? 500);
      await ctx.main.viewport(
        entry.width ?? defaultW,
        entry.height ?? defaultH,
        1,
      );
      await ctx.sleep(220);
      const layout = await ctx.main.eval(
        `({ scrollW: document.documentElement.scrollWidth, innerW: innerWidth, scrollH: document.documentElement.scrollHeight, innerH: innerHeight, dpr: devicePixelRatio })`,
      );
      const census = await ctx.main.probe(censusProbe, {
        selector: interactive,
      });
      metrics[entry.name] = {
        ...layout,
        controls: census.controls,
        names: census.names,
      };
      const file = ctx.outPath(`${entry.name}.png`);
      await ctx.main.shot(file);
      await saved(entry.name, file);
    } catch (e) {
      ctx.ok(`captured ${entry.name}`, false, e.message);
    } finally {
      await ctx.main.clearViewport().catch(() => {});
    }
  }
}

// ---- widget ----------------------------------------------------------------------------------
const w = spec.widget;
if (!ctx.args.mainOnly && ctx.widget && w) {
  ctx.section("widget");
  const backdrops = config.backdrops ?? {
    dark: { r: 27, g: 27, b: 27, a: 1 },
    light: { r: 222, g: 222, b: 222, a: 1 },
  };
  const [hx, hy] = w.hoverPoint ?? [80, 24];

  async function shootWidget(name, { hover = false, bg = "dark" } = {}) {
    await ctx.widget.backdrop(backdrops[bg]);
    if (hover) await ctx.widget.hover(hx, hy);
    else await ctx.widget.hover(-20, -20);
    await ctx.sleep(450);
    const file = ctx.outPath(`${name}.png`);
    await ctx.widget.shot(file);
    await ctx.widget.backdrop(null);
    await saved(name, file);
  }

  for (const size of w.sizes) {
    await w.setSize(ctx, size);
    for (const row of w.matrix) {
      const base = `widget-${size}-${row.state}`;
      const names = [base, `${base}-hover`, `${base}-more`, `${base}-lightbg`];
      if (!names.some(wanted)) continue;
      try {
        await ctx.main.invoke("reset_timer");
        await ctx.sleep(250);
        await w.states[row.state](ctx);
        await ctx.sleep(500);
        if (wanted(base)) await shootWidget(base);
        if (row.hover && wanted(`${base}-hover`))
          await shootWidget(`${base}-hover`, { hover: true });
        if (row.more && wanted(`${base}-more`)) {
          await ctx.widget.hover(hx, hy);
          await ctx.sleep(300);
          await w.openMore(ctx);
          await shootWidget(`${base}-more`, { hover: true });
          await ctx.widget.reload(900); // back to the widget's first page
        }
        if (row.lightbg && wanted(`${base}-lightbg`))
          await shootWidget(`${base}-lightbg`, { bg: "light" });
      } catch (e) {
        ctx.ok(`captured ${base}*`, false, e.message);
      }
    }
  }
  await w.setSize(ctx, w.defaultSize ?? w.sizes[0]);
  await ctx.main.invoke("reset_timer");
}

fs.writeFileSync(ctx.outPath("metrics.json"), JSON.stringify(metrics, null, 2));
await run.close(`output: ${ctx.out}\n`);
