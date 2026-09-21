// Proves the detectors are not vacuous: inject a known defect into the live page, confirm the
// matching detector reports it, remove it, confirm the page is clean again.
//
//   node shared/detector-check.mjs          (needs a running isolated instance, like any runner)
//   node shared/detector-check.mjs --perf   also inject a CPU-hungry animation and check it trips the budget (~40 s)
//
// Defects injected (all by adding a <style> or a node; the app's own code is never touched):
//   horizontal overflow | a control pushed off the window edge | text clipped by its own box
//   an undersized target | an infinite animation | a control with no accessible name | a hidden focus ring
//   content clipped inside the widget window
import {
  animationsProbe,
  clipProbe,
  focusProbe,
  layoutProbe,
} from "./probes.mjs";
import { openRun } from "./run.mjs";

const run = await openRun({ name: "detector-check" });
const { ctx, config, spec } = run;
const main = ctx.main;
const opts = {
  interactiveSelector:
    config.probes?.interactiveSelector ??
    "button, input:not([type=hidden]), select, textarea, a[href]",
  textSelector: config.probes?.textSelector ?? "",
  truncationSelectors: [], // rely on automatic clip detection
  heroSelector: null,
  minTargetPx: config.probes?.minTargetPx ?? 24,
  autoClip: true,
};
const faceSelectors = config.probes?.focusFaceSelectors ?? [];

const inject = (css) =>
  main.eval(
    `(() => { let s = document.getElementById('qa-defect'); if (!s) { s = document.createElement('style'); s.id = 'qa-defect'; document.head.appendChild(s); } s.textContent = ${JSON.stringify(css)}; return 1 })()`,
  );
const clean = () =>
  main.eval(
    `document.getElementById('qa-defect')?.remove(); document.querySelectorAll('.qa-target,#qa-unnamed').forEach(e => { e.classList.remove('qa-target'); if (e.id === 'qa-unnamed') e.remove(); }); 1`,
  );
/** Tag the first visible button that has text, so a defect can target one real control. */
const tagButton = () =>
  main.eval(
    `(() => { const b = [...document.querySelectorAll('button')].find(e => { const r = e.getBoundingClientRect(); return r.width > 30 && r.height > 20 && (e.innerText || '').trim() && getComputedStyle(e).visibility !== 'hidden' }); if (!b) return false; b.classList.add('qa-target'); return true })()`,
  );

try {
  await spec.reset(ctx);
  await main.viewport(...config.windows.main.defaultSize, 1);
  await ctx.sleep(400);
  const flags = (m) => ({
    h: m.hOverflow,
    edge: m.offEdge.length,
    clip: m.truncated.length,
    small: m.smallTargets.length,
  });
  const clear = async (label) => {
    await clean();
    await ctx.sleep(150);
    const m = flags(await main.probe(layoutProbe, opts));
    ctx.ok(
      `${label}: page is clean again after removing the defect`,
      !m.h && !m.edge && !m.clip && !m.small,
      JSON.stringify(m),
    );
  };

  const baseline = flags(await main.probe(layoutProbe, opts));
  ctx.ok(
    "baseline: no flags before any defect is injected",
    !baseline.h && !baseline.edge && !baseline.clip && !baseline.small,
    JSON.stringify(baseline),
  );

  await inject("body { min-width: 2600px !important; }");
  await ctx.sleep(200);
  ctx.ok(
    "detects horizontal overflow",
    (await main.probe(layoutProbe, opts)).hOverflow === true,
  );
  await clear("overflow");

  ctx.ok("a real button is available for targeted defects", await tagButton());
  await inject(
    ".qa-target { position: fixed !important; left: -400px !important; }",
  );
  await ctx.sleep(200);
  ctx.ok(
    "detects a control pushed off the window edge",
    (await main.probe(layoutProbe, opts)).offEdge.length > 0,
  );
  await clear("off-edge");

  await tagButton();
  await inject(
    ".qa-target { display: block !important; max-width: 14px !important; overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; }",
  );
  await ctx.sleep(200);
  ctx.ok(
    "detects text clipped by its own box",
    (await main.probe(layoutProbe, opts)).truncated.length > 0,
  );
  await clear("clipping");

  await tagButton();
  await inject(
    ".qa-target { width: 10px !important; height: 10px !important; min-width: 0 !important; min-height: 0 !important; padding: 0 !important; overflow: hidden !important; }",
  );
  await ctx.sleep(200);
  ctx.ok(
    "detects an undersized target",
    (await main.probe(layoutProbe, opts)).smallTargets.length > 0,
  );
  await clear("small target");

  await inject(
    "@keyframes qa-spin { to { opacity: 0.6 } } body { animation: qa-spin 1s linear infinite !important; }",
  );
  await ctx.sleep(300);
  ctx.ok(
    "detects an infinite animation",
    (await main.probe(animationsProbe)).infinite >= 1,
  );
  await clear("animation");

  await main.eval(
    `(() => { const b = document.createElement('button'); b.id = 'qa-unnamed'; document.body.appendChild(b); return 1 })()`,
  );
  const named = (nodes) =>
    nodes.filter(
      (n) =>
        !n.ignored &&
        n.role?.value === "button" &&
        !(n.name?.value || "").trim(),
    ).length;
  ctx.ok(
    "detects a control with no accessible name",
    named(await main.axTree()) >= 1,
  );
  await clear("unnamed control");

  await main.eval(`document.activeElement?.blur(); 1`);
  await main.key("Tab");
  await ctx.sleep(120);
  const ringOn = await main.probe(focusProbe, { faceSelectors });
  ctx.ok(
    "baseline: keyboard focus shows a ring",
    ringOn?.ring === true,
    JSON.stringify(ringOn),
  );
  await inject("*:focus, *:focus-visible { outline: none !important; }");
  await ctx.sleep(150);
  const ringOff = await main.probe(focusProbe, { faceSelectors });
  ctx.ok(
    "detects a hidden focus ring",
    ringOff && ringOff.ring === false,
    JSON.stringify(ringOff),
  );
  await clean();

  // The widget's own clip detector (a window that is exactly its content size).
  const wspec = spec.widget;
  if (ctx.widget && wspec?.clipSelectors?.length) {
    const win = ctx.widget;
    const clipOpts = { clipSelectors: wspec.clipSelectors };
    await wspec.states.study(ctx);
    await ctx.sleep(600);
    await win.hover(-20, -20);
    const before = await win.probe(clipProbe, clipOpts);
    ctx.ok(
      "widget baseline: nothing clipped",
      before.clipped.length === 0 && !before.overflowX && !before.overflowY,
      JSON.stringify(before),
    );
    await win.eval(
      `(() => { const s = document.createElement('style'); s.id = 'qa-defect'; s.textContent = ${JSON.stringify(`${wspec.clipSelectors[0]} { display: block !important; width: 12px !important; overflow: hidden !important; }`)}; document.head.appendChild(s); return 1 })()`,
    );
    await ctx.sleep(200);
    const after = await win.probe(clipProbe, clipOpts);
    ctx.ok(
      "detects clipped widget content",
      after.clipped.length > 0,
      JSON.stringify(after),
    );
    await win.eval(`document.getElementById('qa-defect')?.remove(); 1`);
    await ctx.sleep(150);
    const restored = await win.probe(clipProbe, clipOpts);
    ctx.ok(
      "widget: clean again after removing the defect",
      restored.clipped.length === 0,
      JSON.stringify(restored),
    );
    await ctx.main.invoke("reset_timer");
  }

  // Optional (slow): a CPU-hungry animation must trip the performance budget.
  if (run.args.perf && spec.performance?.states?.length) {
    const perf = spec.performance;
    const state =
      perf.states.find((s) => s.id === perf.defect?.state) ??
      perf.states[1] ??
      perf.states[0];
    const css =
      perf.defect?.css ??
      "@keyframes qa-hot { from { filter: hue-rotate(0deg) } to { filter: hue-rotate(360deg) } } body { animation: qa-hot 1s linear infinite !important; }";
    await state.enter(ctx);
    await ctx.sleep(3000);
    const base = ctx.native.cpu(8).data?.percentOfOneCore;
    await inject(css);
    await ctx.sleep(1500);
    const hot = ctx.native.cpu(8).data?.percentOfOneCore;
    const budget = state.budget ?? 30;
    ctx.note(
      `CPU in "${state.id}": ${base}% baseline, ${hot}% with the injected animation (budget ${budget}%)`,
    );
    ctx.ok(
      "a CPU-hungry animation exceeds the performance budget",
      hot > budget,
      `${hot}% <= ${budget}%`,
    );
    await clean();
  }
} finally {
  await main.clearViewport().catch(() => {});
  await spec.reset(ctx).catch(() => {}); // reload also drops any injected node
}
await run.close();
