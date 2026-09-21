// Starting point for a new app's spec. Copy this file to <app>.spec.mjs next to a filled-in
// <app>.config.json (see template.config.json). Everything here is app knowledge; the runners
// contain none. Delete the sections you do not need: a runner only needs the parts it reads.
//
// Every function receives `ctx`:
//   ctx.main / ctx.widget   window handles (null when the app has no such window)
//                           .click(text)  .pointerClick(selector)  .key("Tab")  .hover(x, y)
//                           .setValue(selector, value)  .text(selector)  .$(selector, "e.expr")
//                           .invoke(command, args)  .eval(js)  .probe(fn, arg)  .reload()  .shot(file)
//   ctx.ok(name, condition, detail)   record one PASS/FAIL check
//   ctx.enter(surfaceId)              go to a surface defined below
//   ctx.sleep(ms)  ctx.config  ctx.out

/** Bring the app to a known idle state on its first screen. Surfaces start from here. */
async function reset(ctx) {
  await ctx.main.reload(1500);
}

export default {
  name: "MYAPP",
  reset,

  // Independent ways to reach each screen. Capture, responsive and accessibility runs share them.
  surfaces: {
    home: {
      window: "main",
      enter: async (ctx) => {
        await reset(ctx);
      },
    },
    // "settings": { window: "main", enter: async (ctx) => { await reset(ctx); await ctx.main.click("settings"); } },
  },

  // Evidence capture: names should stay stable so a baseline run pairs with a later run.
  capture: {
    main: [{ name: "01-home", surface: "home" }],
  },

  // Surfaces for the responsive matrix (viewports come from the config).
  responsive: { surfaces: ["home"], scrollsByDesign: [] },

  // Tab order, accessible names and focus rings per surface; add keyboard probes for custom widgets.
  accessibility: {
    surfaces: [{ surface: "home", label: "home" }],
    keyboard: [],
  },

  // Per-state CPU budgets (% of one core; deliberately generous, they catch step changes).
  performance: {
    states: [{ id: "idle", enter: reset, budget: 10 }],
  },

  // Functional flows: real input, then assert on the app's own state through an IPC command.
  functional: {
    mutates: true,
    async prepare() {},
    sections: [
      {
        id: "smoke",
        title: "The app opens",
        async run(ctx) {
          ctx.ok(
            "the main window has content",
            (await ctx.main.count("body *")) > 0,
          );
        },
      },
    ],
  },

  // Optional: a secondary always-on-top window (widget, overlay). See sundial.spec.mjs for the full shape.
  // widget: { sizes: [], setSize, states: {}, matrix: [], openMore, clipSelectors: [], controls: {} },

  // Optional: launch/quit/restore scenarios. See sundial.spec.mjs.
  // lifecycle: { settleMs: 4000, scenarios: [], restore: { states: [], craft, observe, expect } },
};
