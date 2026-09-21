// Widget-state and widget-size QA. For every size and every state the spec lists:
//   - the window is exactly the size the config says (checked in the page and by the OS, see --native)
//   - nothing overflows or is clipped, at rest, on hover and on the secondary ("more") page
//   - controls stay hidden at rest and appear on hover
// and a screenshot is kept for each variant so a human can judge the look.
//
//   node widget/run.mjs                       all sizes x states
//   node widget/run.mjs --only small,paused   filter by size or state name
//   node widget/run.mjs --native              also compare against the OS window rectangle (Win32)
//   node widget/run.mjs --no-shots
import { clipProbe } from "../shared/probes.mjs";
import { openRun } from "../shared/run.mjs";

const run = await openRun({ name: "widget" });
const { ctx, config, spec, args } = run;
const w = spec.widget;
if (!ctx.widget || !w)
  throw new Error("no widget window / spec.widget in this app's config");
const sizes = config.windows.widget.sizes ?? {};
const backdrops = config.backdrops ?? { dark: { r: 27, g: 27, b: 27, a: 1 } };
const [hx, hy] = w.hoverPoint ?? [80, 24];
const wanted = (size, state) =>
  !ctx.only || ctx.only.includes(size) || ctx.only.includes(state);

const probeOpts = { clipSelectors: w.clipSelectors ?? [".widget *"] };

async function measure(label, shotName) {
  const m = await ctx.widget.probe(clipProbe, probeOpts);
  ctx.ok(
    `${label}: no overflow, nothing clipped`,
    !m.overflowX && !m.overflowY && m.clipped.length === 0,
    `${m.overflowX ? "overflow-x " : ""}${m.overflowY ? "overflow-y " : ""}${m.clipped.join("|")}`,
  );
  if (!args.noShots) {
    await ctx.widget.backdrop(backdrops.dark);
    await ctx.widget.shot(ctx.outPath(`${shotName}.png`));
    await ctx.widget.backdrop(null);
  }
  return m;
}

for (const size of w.sizes) {
  if (
    ctx.only &&
    !ctx.only.includes(size) &&
    !w.matrix.some((r) => ctx.only.includes(r.state))
  )
    continue;
  ctx.section(`size: ${size}`);
  await w.setSize(ctx, size);
  const want = sizes[size];
  if (want) {
    const inner = await ctx.widget.eval(`[innerWidth, innerHeight]`);
    ctx.ok(
      `${size}: widget window is ${want.join("x")} in the page`,
      inner[0] === want[0] && inner[1] === want[1],
      `${inner.join("x")}`,
    );
    if (args.native) {
      const os = ctx.native.win32("windows").data?.windows ?? [];
      const smallest = os
        .slice()
        .sort((a, b) => a.width * a.height - b.width * b.height)[0];
      // The OS rectangle includes the frame, so it can only be at least as large as the client area.
      ctx.ok(
        `${size}: the OS window is at least ${want.join("x")}`,
        Boolean(smallest) &&
          smallest.width >= want[0] &&
          smallest.height >= want[1],
        JSON.stringify(smallest),
      );
    }
  }
  for (const row of w.matrix) {
    if (!wanted(size, row.state)) continue;
    const id = `${size}/${row.state}`;
    try {
      await ctx.main.invoke("reset_timer");
      await ctx.sleep(250);
      await w.states[row.state](ctx);
      await ctx.sleep(500);
      await ctx.widget.hover(-20, -20);
      await ctx.sleep(450);
      await measure(`${id} at rest`, `widget-${size}-${row.state}`);
      if (w.controls) {
        const hidden = await ctx.widget.$(
          w.controls.selector,
          "getComputedStyle(e).opacity",
        );
        if (w.controls.hiddenAtRest && row.hover)
          ctx.ok(
            `${id}: controls hidden at rest`,
            hidden === "0",
            `opacity ${hidden}`,
          );
      }
      if (row.hover) {
        await ctx.widget.hover(hx, hy);
        await ctx.sleep(450);
        if (w.controls) {
          const shown = await ctx.widget.$(
            w.controls.selector,
            "getComputedStyle(e).opacity",
          );
          ctx.ok(
            `${id}: controls appear on hover`,
            shown === "1",
            `opacity ${shown}`,
          );
        }
        await measure(`${id} hovered`, `widget-${size}-${row.state}-hover`);
      }
      if (row.more) {
        await ctx.widget.hover(hx, hy);
        await ctx.sleep(300);
        await w.openMore(ctx);
        await ctx.sleep(400);
        await measure(
          `${id} secondary page`,
          `widget-${size}-${row.state}-more`,
        );
        await ctx.widget.reload(900);
      }
    } catch (e) {
      ctx.ok(`${id} checked`, false, e.message);
    }
  }
}
await ctx.widget.hover(-20, -20);
await w.setSize(ctx, w.defaultSize ?? w.sizes[0]);
await ctx.main.invoke("reset_timer");
await run.close();
