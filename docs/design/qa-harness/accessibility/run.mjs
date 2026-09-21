// Accessibility, keyboard and reduced-motion QA over the real app.
//
//   node accessibility/run.mjs                run everything the spec lists
//   node accessibility/run.mjs --only study-setup,active
//
// Per surface: every interactive node in the browser's accessibility tree has a name, and walking
// Tab visits every control in a sensible order with a visible focus ring (>= 2px outline).
// Per spec: app-specific keyboard behaviour, the readout's announced form, reduced-motion states,
// and (if the app has a widget) that its controls are reachable by keyboard, not just hover.
//
// This is a CDP-driven check of what the browser exposes and paints. It is not a screen-reader run.
import fs from "node:fs";
import { animationsProbe, focusProbe } from "../shared/probes.mjs";
import { openRun } from "../shared/run.mjs";

const run = await openRun({ name: "accessibility" });
const { ctx, config, spec } = run;
const a11y = spec.accessibility;
const report = {
  axNames: {},
  tabOrder: {},
  focusRing: {},
  reducedMotion: {},
  widgetKeyboard: {},
};
const faceSelectors = config.probes?.focusFaceSelectors ?? [];
const wanted = (id) => !ctx.only || ctx.only.includes(id);

const INTERACTIVE_ROLES = new Set([
  "button",
  "radio",
  "checkbox",
  "switch",
  "combobox",
  "slider",
  "textbox",
  "spinbutton",
  "link",
  "tab",
  "menuitem",
  "listbox",
]);

async function axAudit(win, label) {
  const nodes = await win.axTree();
  const interactive = nodes.filter(
    (n) => !n.ignored && INTERACTIVE_ROLES.has(n.role?.value),
  );
  const unnamed = interactive
    .filter((n) => !(n.name?.value || "").trim())
    .map((n) => `${n.role.value}#${n.nodeId}`);
  report.axNames[label] = { interactiveNodes: interactive.length, unnamed };
  ctx.ok(
    `${label}: every interactive element has an accessible name (${interactive.length} checked)`,
    unnamed.length === 0,
    unnamed.join(","),
  );
}

async function walkTab(win, label, maxStops = 40) {
  await win.eval(
    `document.activeElement?.blur(); window.scrollTo(0,0); 'reset'`,
  );
  const stops = [];
  for (let i = 0; i < maxStops; i++) {
    await win.key("Tab");
    await ctx.sleep(60);
    const s = await win.probe(focusProbe, { faceSelectors });
    if (!s) break;
    if (
      stops.length &&
      stops[0].name === s.name &&
      stops[0].tag === s.tag &&
      i > 2
    )
      break; // wrapped around
    stops.push(s);
  }
  report.tabOrder[label] = stops.map((s) => `${s.tag} "${s.name}"`);
  const noRing = stops.filter((s) => !s.ring).map((s) => s.name);
  report.focusRing[label] = { stops: stops.length, withoutVisibleRing: noRing };
  ctx.ok(
    `${label}: Tab reaches ${stops.length} stops and every one shows a focus ring`,
    stops.length > 0 && noRing.length === 0,
    noRing.join(" | ") || "no focusable element",
  );
  ctx.note(`tab order: ${report.tabOrder[label].join("  ->  ")}`);
}

// ---- surfaces ------------------------------------------------------------------------------------
for (const s of a11y.surfaces) {
  const label = s.label ?? s.surface;
  if (!wanted(label)) continue;
  ctx.section(`surface: ${label}`);
  try {
    await ctx.enter(s.surface);
    await ctx.sleep(400);
    await axAudit(ctx.main, label);
    await walkTab(ctx.main, label, s.maxStops);
    if (s.describe) {
      const described = await ctx.main.probe(s.describe);
      report[`${label}Describe`] = described;
      a11y.describeExpect?.(described, ctx.ok);
    }
  } catch (e) {
    ctx.ok(`${label} audited`, false, e.message);
  }
}

// ---- app-specific keyboard behaviour --------------------------------------------------------------------
for (const k of a11y.keyboard ?? []) {
  if (!wanted(k.id)) continue;
  ctx.section(`keyboard: ${k.id}`);
  try {
    await ctx.enter(k.surface);
    await ctx.sleep(300);
    await k.run(ctx, report);
  } catch (e) {
    ctx.ok(`keyboard ${k.id} ran`, false, e.message);
  }
}

// ---- reduced motion ---------------------------------------------------------------------------------------------
if (a11y.reducedMotion && wanted("reduced-motion")) {
  ctx.section("reduced motion (prefers-reduced-motion emulation)");
  const rm = a11y.reducedMotion;
  for (const st of rm.states) {
    try {
      await ctx.main.media(
        st.reduced ? [{ name: "prefers-reduced-motion", value: "reduce" }] : [],
      );
      if (st.reduced) await ctx.main.reload(1800);
      await st.enter(ctx);
      await ctx.sleep(600);
      const anim = await ctx.main.probe(animationsProbe);
      const extra = rm.extra ? await ctx.main.probe(rm.extra) : {};
      report.reducedMotion[st.id] = { ...anim, extra };
      const e = st.expect ?? {};
      const problems = [];
      if (e.running !== undefined && anim.running !== e.running)
        problems.push(`running=${anim.running}`);
      if (e.infinite !== undefined && anim.infinite !== e.infinite)
        problems.push(`infinite=${anim.infinite}`);
      for (const [key, want] of Object.entries(e.extra ?? {}))
        if (extra[key] !== want) problems.push(`${key}=${extra[key]}`);
      ctx.ok(
        `motion [${st.id}]: ${JSON.stringify({ ...anim, ...extra })}`,
        problems.length === 0,
        problems.join(" "),
      );
    } catch (err) {
      ctx.ok(`motion [${st.id}] measured`, false, err.message);
    }
  }
  await ctx.main.media([]);
  await ctx.main.reload(1500);
}

// ---- the widget: reachable by keyboard, not only by hover ---------------------------------------------------------------
const wcfg = spec.widget?.controls;
if (ctx.widget && wcfg && wanted("widget")) {
  ctx.section("widget keyboard access");
  try {
    if (a11y.widget?.restState)
      await spec.widget.states[a11y.widget.restState](ctx);
    await ctx.widget.reload(1500); // start from the widget's first page, not a leftover secondary page
    await ctx.widget.eval(`document.activeElement?.blur(); 'b'`);
    await ctx.widget.hover(-20, -20); // pointer away, so only keyboard focus can reveal the controls
    await ctx.sleep(500);
    const opacity = () =>
      ctx.widget.$(wcfg.selector, "getComputedStyle(e).opacity");
    const before = await opacity();
    await ctx.widget.key("Tab");
    await ctx.sleep(300);
    const after = await opacity();
    const focused = await ctx.widget.eval(
      `document.activeElement?.getAttribute('aria-label')`,
    );
    report.widgetKeyboard = {
      controlsOpacityBeforeFocus: before,
      controlsOpacityAfterTab: after,
      firstFocused: focused,
    };
    if (wcfg.hiddenAtRest)
      ctx.ok(
        "widget controls are hidden until pointer or keyboard focus",
        before === "0",
        `opacity ${before}`,
      );
    ctx.ok(
      "Tab reveals the widget controls (no hover-only functionality)",
      after === "1",
      `opacity ${after}`,
    );
    ctx.ok(
      "the first focused widget control is named",
      Boolean(focused),
      String(focused),
    );
    await axAudit(ctx.widget, "widget");
  } catch (e) {
    ctx.ok("widget keyboard access checked", false, e.message);
  }
}

fs.writeFileSync(ctx.outPath("a11y.json"), JSON.stringify(report, null, 2));
try {
  await ctx.spec.reset?.(ctx);
} catch {
  /* best effort: leave the app idle */
}
await run.close();
