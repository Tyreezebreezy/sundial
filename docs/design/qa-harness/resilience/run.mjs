import { openRun } from "../shared/run.mjs";
import { layoutProbe, clipProbe } from "../shared/probes.mjs";
const run = await openRun({ name: "resilience" });
const { ctx, config } = run;
const opts = { ...config.probes };
const boot = () => ctx.main.invoke("get_boot_data");
const measure = () => ctx.main.probe(layoutProbe, opts);
const plan = (phases, label = null) => ({
  mode: "study",
  phases,
  visual: "sundial",
  autoAdvance: false,
  label,
  presetName: "Deep Study",
});
const phase = (kind, m) => ({ kind, durationMs: m * 60000 });
try {
  await ctx.enter("study-setup");
  await ctx.main.viewport(900, 760, 1);
  const ratio = () =>
    ctx.main.eval(
      `(()=>{const s=[...document.querySelectorAll('.sunline-seg')];return s[0].getBoundingClientRect().width/s[1].getBoundingClientRect().width})()`,
    );
  ctx.ok(
    "Sunline labelled 45:15 measures 3:1",
    Math.abs((await ratio()) - 3) < 0.02,
  );
  await ctx.main.eval(
    `(()=>{const s=document.createElement('style');s.id='ratio-defect';s.textContent='.sunline-seg{flex-basis:auto!important}';document.head.append(s)})()`,
  );
  ctx.ok(
    "Mutation: original auto basis distorts the measured duration ratio",
    Math.abs((await ratio()) - 3) > 0.02,
  );
  await ctx.main.eval(`document.getElementById('ratio-defect').remove()`);
  ctx.ok(
    "Mutation removed: duration ratio recovers",
    Math.abs((await ratio()) - 3) < 0.02,
  );
  await ctx.main.click("custom");
  await ctx.main.setValue("#study-total-custom-h", "2");
  await ctx.main.setValue("#study-total-custom-m", "37");
  await ctx.main.pointerClick(".start-cta");
  const odd = (await boot()).state.plan.phases;
  ctx.ok(
    "2h37m retains exact total and shortened final Study",
    odd.reduce((n, p) => n + p.durationMs, 0) === 157 * 60000 &&
      odd.at(-1).kind === "study" &&
      odd.at(-1).durationMs === 37 * 60000,
  );
  await ctx.main.invoke("pause_timer");
  const before = (await boot()).state.pausedRemainingMs;
  for (let i = 0; i < 5; i++)
    await ctx.main.pointerClick('[aria-label="Add 5 minutes"]', 0);
  await ctx.sleep(300);
  ctx.ok(
    "Rapid +5 clicks add exactly 25 minutes",
    (await boot()).state.pausedRemainingMs === before + 25 * 60000,
  );
  for (let i = 0; i < 3; i++) {
    await ctx.main.click("Resume");
    await ctx.sleep(80);
    await ctx.main.click("Pause");
    await ctx.sleep(80);
  }
  ctx.ok("Rapid pause/resume settles paused", (await boot()).state.isPaused);
  await ctx.main.eval(
    `document.querySelector('[aria-label="Add 5 minutes"]').focus()`,
  );
  const spaceBefore = (await boot()).state.pausedRemainingMs;
  await ctx.main.key("Space");
  await ctx.sleep(200);
  const spaceAfter = (await boot()).state;
  ctx.ok(
    "Space activates focused +5 once without resuming",
    spaceAfter.isPaused &&
      spaceAfter.pausedRemainingMs === spaceBefore + 5 * 60000,
  );
  await ctx.main.key("f");
  await ctx.sleep(350);
  for (const [w, h] of [
    [640, 560],
    [1920, 1080],
    [2560, 1440],
    [3840, 2160],
  ]) {
    await ctx.main.viewport(w, h, 1);
    await ctx.sleep(150);
    const m = await measure();
    ctx.ok(
      "Focus Display fits " + w + "x" + h,
      !m.hOverflow && !m.vScroll && !m.offEdge.length && !m.truncated.length,
      JSON.stringify(m),
    );
    await ctx.main.shot(ctx.outPath("focus-" + w + ".png"));
  }
  await ctx.main.viewport(320, 280, 2);
  const zoom = await measure();
  ctx.ok(
    "Focus Display 200% narrow view scrolls without horizontal clipping",
    !zoom.hOverflow && !zoom.offEdge.length,
    JSON.stringify(zoom),
  );
  await ctx.main.key("Escape");
  await ctx.main.clearViewport();
  await ctx.main.invoke(
    "start_session",
    plan(
      Array.from({ length: 1440 }, (_, i) =>
        phase(i % 2 ? "break" : "study", 1),
      ),
    ),
  );
  await ctx.sleep(400);
  await ctx.main.viewport(640, 560, 1);
  const dense = await measure();
  ctx.ok(
    "24h / 1440-phase Sunline stays within minimum window",
    !dense.hOverflow && !dense.offEdge.length,
    JSON.stringify(dense),
  );
  await ctx.main.shot(ctx.outPath("dense-plan.png"));
  await ctx.main.invoke(
    "start_session",
    plan([phase("study", 1)], "集中時間—Ångström—" + "W".repeat(40)),
  );
  await ctx.sleep(300);
  const long = await measure();
  ctx.ok(
    "Long Unicode session identity wraps in Active Study",
    !long.hOverflow && !long.truncated.length,
    JSON.stringify(long),
  );
  await ctx.main.shot(ctx.outPath("long-name-active.png"));
  for (const size of ["small", "medium", "large"]) {
    await ctx.spec.widget.setSize(ctx, size);
    await ctx.sleep(300);
    const bounds = await ctx.widget.eval(
      `(()=>{const r=document.querySelector('.widget-readout').getBoundingClientRect();const b=document.querySelector('.widget-slot').getBoundingClientRect();return {readout:r.right<=innerWidth&&r.bottom<=innerHeight,controls:b.right<=innerWidth&&b.bottom<=innerHeight}})()`,
    );
    ctx.ok(
      size + " widget preserves readout/control space for long identity",
      bounds.readout && bounds.controls,
      JSON.stringify(bounds),
    );
    await ctx.widget.shot(ctx.outPath("long-name-widget-" + size + ".png"));
  }
  await ctx.widget.click("More actions");
  await ctx.sleep(150);
  await ctx.widget.click("Focus Display");
  await ctx.sleep(350);
  ctx.ok(
    "Widget Focus Display opens the same authoritative session",
    (await ctx.main.count(".focus-display")) === 1 &&
      (await boot()).state.plan.label.startsWith("集中時間"),
  );
  await ctx.main.key("Escape");
  await ctx.main.media([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await ctx.main.key("f");
  await ctx.sleep(100);
  ctx.ok(
    "Reduced-motion Focus entry has no active animations",
    (await ctx.main.eval(
      'document.getAnimations().filter(a=>a.playState==="running").length',
    )) === 0,
  );
} finally {
  await ctx.main.media([]);
  await ctx.main.clearViewport();
  await ctx.main.invoke("reset_timer");
  await run.close();
}
