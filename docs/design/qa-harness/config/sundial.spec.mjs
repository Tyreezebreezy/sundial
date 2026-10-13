// SUNDIAL scenarios for the QA harness. Everything app-specific lives here: how to reach each
// surface, which widget states exist, the functional flows, and what "correct" looks like.
// The runners (../capture, ../functional, ../accessibility, ../responsive, ../widget,
// ../performance) contain no SUNDIAL knowledge; they read this module and sundial.config.json.
//
// A spec function receives `ctx` (see shared/run.mjs): ctx.main / ctx.widget are Win helpers
// (click, pointerClick, key, invoke, text, probe, shot, ...), ctx.ok records a PASS/FAIL check.

const MIN = 60_000;
const phase = (kind, minutes) => ({ kind, durationMs: minutes * MIN });

/** A Deep Study plan (45/15 x2) in the shape the engine's start_session command takes. */
const study = (visual = "disk", extra = {}) => ({
  mode: "study",
  phases: [
    phase("study", 45),
    phase("break", 15),
    phase("study", 45),
    phase("break", 15),
  ],
  visual,
  autoAdvance: false,
  label: null,
  presetName: "Deep Study",
  ...extra,
});
const timer = (durationMs, visual = "disk") => ({
  mode: "timer",
  phases: [{ kind: "timer", durationMs }],
  visual,
  autoAdvance: true,
  label: null,
  presetName: null,
});
/** Short blocks so a completion state is reached in seconds instead of minutes. */
const quickPlan = (blocks, extra = {}) =>
  study("disk", {
    phases: blocks.map(([kind, ms]) => ({ kind, durationMs: ms })),
    ...extra,
  });

const boot = (ctx) => ctx.main.invoke("get_boot_data");
const mins = (phases) => phases.map((p) => p.durationMs / MIN);
const kinds = (phases) => phases.map((p) => p.kind[0]).join("");

/** Idle engine, fresh UI state, Study tab. Every surface starts here, so surfaces are independent. */
async function home(ctx) {
  await ctx.main.invoke("reset_timer");
  await ctx.main.reload(1600);
  await ctx.main.click("study");
  await ctx.sleep(250);
}

// ---- surfaces of the main window ----------------------------------------------------------------
const surfaces = {
  "study-setup": {
    window: "main",
    enter: async (ctx) => {
      await home(ctx);
      await ctx.main.click("2 hours");
      await ctx.sleep(200);
    },
  },
  // The Sunline is always visible once there's a plan; this is the custom
  // 2h30m duration so it shows all 5 segments, including the shortened
  // final study block, rather than the plain 4-segment 2h default.
  "study-plan": {
    window: "main",
    enter: async (ctx) => {
      await surfaces["study-setup"].enter(ctx);
      await ctx.main.click("custom");
      await ctx.sleep(200);
      await ctx.main.setValue("#study-total-custom-h", "2");
      await ctx.main.setValue("#study-total-custom-m", "30");
      await ctx.sleep(250);
    },
  },
  "study-options": {
    window: "main",
    enter: async (ctx) => {
      await surfaces["study-setup"].enter(ctx);
      await ctx.main.click("options");
    },
  },
  "preset-selector": {
    window: "main",
    enter: async (ctx) => {
      await surfaces["study-setup"].enter(ctx);
      await ctx.main.eval(
        `document.querySelector('.preset-trigger').click(); 'ok'`,
      );
      await ctx.sleep(250);
    },
  },
  "custom-preset": {
    window: "main",
    enter: async (ctx) => {
      await home(ctx);
      await ctx.main.eval(
        `document.querySelector('.preset-trigger').click(); 'ok'`,
      );
      await ctx.sleep(300);
      await ctx.main.click("custom preset");
      await ctx.sleep(300);
    },
  },
  "timer-setup": {
    window: "main",
    enter: async (ctx) => {
      await home(ctx);
      await ctx.main.click("timer");
      await ctx.sleep(300);
      await ctx.main.click("25");
      await ctx.sleep(150);
    },
  },
  // The tallest Timer setup state: the Custom fields are open.
  "timer-setup-custom": {
    window: "main",
    enter: async (ctx) => {
      await home(ctx);
      await ctx.main.click("timer");
      await ctx.sleep(300);
      await ctx.main.click("custom");
      await ctx.sleep(200);
      await ctx.main.setValue("#timer-custom-h", "1");
      await ctx.main.setValue("#timer-custom-m", "15");
      await ctx.sleep(200);
    },
  },
  settings: {
    window: "main",
    enter: async (ctx) => {
      await home(ctx);
      await ctx.main.click("settings");
      await ctx.sleep(400);
    },
  },
  "active-disk": {
    window: "main",
    enter: async (ctx) => {
      await home(ctx);
      await ctx.main.invoke("start_session", study("disk"));
    },
  },
  "active-hourglass": {
    window: "main",
    enter: async (ctx) => {
      await home(ctx);
      await ctx.main.invoke("start_session", study("hourglass"));
    },
  },
  "active-sundial": {
    window: "main",
    enter: async (ctx) => {
      await home(ctx);
      await ctx.main.invoke("start_session", study("sundial"));
    },
  },
  paused: {
    window: "main",
    enter: async (ctx) => {
      await home(ctx);
      await ctx.main.invoke("start_session", study("disk"));
      await ctx.sleep(300);
      await ctx.main.invoke("pause_timer");
    },
  },
  break: {
    window: "main",
    enter: async (ctx) => {
      await home(ctx);
      await ctx.main.invoke("start_session", study("disk"));
      await ctx.main.invoke("advance_phase");
    },
  },
  "focus-complete": {
    window: "main",
    enter: async (ctx) => {
      await home(ctx);
      await ctx.main.invoke(
        "start_session",
        quickPlan([
          ["study", 1500],
          ["break", 15 * MIN],
          ["study", 45 * MIN],
        ]),
      );
      await ctx.sleep(3200);
    },
  },
  "session-complete": {
    window: "main",
    enter: async (ctx) => {
      await home(ctx);
      await ctx.main.invoke("start_session", quickPlan([["study", 1500]]));
      await ctx.sleep(3200);
    },
  },
  "timer-active": {
    window: "main",
    enter: async (ctx) => {
      await home(ctx);
      await ctx.main.invoke("start_session", timer(30 * MIN));
    },
  },
  "timer-complete": {
    window: "main",
    enter: async (ctx) => {
      await home(ctx);
      await ctx.main.invoke("start_session", timer(1500));
      await ctx.sleep(3200);
    },
  },
  "focus-display": {
    window: "main",
    enter: async (ctx) => {
      await surfaces["active-hourglass"].enter(ctx);
      await ctx.sleep(400);
      await ctx.main.key("f");
      await ctx.sleep(350);
    },
  },
};

// ---- the widget ---------------------------------------------------------------------------------
const widgetStates = {
  idle: (ctx) => ctx.main.invoke("reset_timer"),
  study: (ctx) => ctx.main.invoke("start_session", study("disk")),
  break: async (ctx) => {
    await ctx.main.invoke("start_session", study("disk"));
    await ctx.main.invoke("advance_phase");
  },
  paused: async (ctx) => {
    await ctx.main.invoke("start_session", study("disk"));
    await ctx.sleep(300);
    await ctx.main.invoke("pause_timer");
  },
  awaiting: async (ctx) => {
    await ctx.main.invoke(
      "start_session",
      quickPlan([
        ["study", 1500],
        ["break", 15 * MIN],
        ["study", 45 * MIN],
      ]),
    );
    await ctx.sleep(3200);
  },
  complete: async (ctx) => {
    await ctx.main.invoke("start_session", quickPlan([["study", 1500]]));
    await ctx.sleep(3200);
  },
  timer: (ctx) => ctx.main.invoke("start_session", timer(30 * MIN)),
};

// ---- CSS/JS that reads the page ------------------------------------------------------------------
const motionExtra = () => ({
  stream: Boolean(document.querySelector(".tv-stream")),
});
const readoutProbe = () => {
  const r = document.querySelector(".readout");
  return {
    role: r?.getAttribute("role"),
    label: r?.getAttribute("aria-label"),
    live: document.querySelector(".eyebrow")?.getAttribute("aria-live"),
    tabular: r ? getComputedStyle(r).fontVariantNumeric : null,
  };
};

async function setCloseBehavior(ctx, quitOnClose) {
  await ctx.main.click("settings", "button");
  await ctx.sleep(500);
  await ctx.main.click(
    quitOnClose ? "quit sundial" : "keep sundial running",
    "label",
  );
  await ctx.sleep(600);
  const applied = (await boot(ctx)).settings.quitOnMainClose === quitOnClose;
  await ctx.main.click("close settings", "button");
  return applied;
}

// A trigger that ends the process must not wait for the page's reply.
const fireAndForget = (win, js) =>
  win.eval(js).catch(() => "connection closed by exit");

export default {
  name: "SUNDIAL",
  reset: home,
  surfaces,

  // ---- evidence capture ---------------------------------------------------------------------------
  // Names 01-12 match the v1.0.1 baseline so before/after boards pair one to one.
  capture: {
    main: [
      { name: "01-study-setup", surface: "study-setup" },
      { name: "02-timer-setup", surface: "timer-setup" },
      { name: "03-settings", surface: "settings", height: 1100 },
      { name: "04-study-active-disk", surface: "active-disk", wait: 800 },
      {
        name: "05-study-active-hourglass",
        surface: "active-hourglass",
        wait: 800,
      },
      { name: "06-study-active-sundial", surface: "active-sundial", wait: 800 },
      { name: "07-study-paused", surface: "paused" },
      { name: "08-break", surface: "break" },
      { name: "09-focus-complete", surface: "focus-complete" },
      { name: "10-session-complete", surface: "session-complete" },
      { name: "11-timer-active", surface: "timer-active", wait: 700 },
      { name: "12-timer-complete", surface: "timer-complete" },
      { name: "13-study-setup-plan", surface: "study-plan" },
      {
        name: "14-study-setup-options",
        surface: "study-options",
        height: 1000,
      },
      { name: "15-preset-selector", surface: "preset-selector" },
      { name: "16-custom-preset", surface: "custom-preset" },
      { name: "17-focus-display", surface: "focus-display", wait: 400 },
    ],
  },

  // ---- widget matrix (capture + widget QA) --------------------------------------------------------
  widget: {
    sizes: ["small", "medium", "large"],
    defaultSize: "medium",
    // Same two calls the Settings screen makes.
    async setSize(ctx, size) {
      const b = await boot(ctx);
      await ctx.main.invoke("update_settings", {
        settings: { ...b.settings, widgetSize: size },
      });
      await ctx.main.invoke("set_widget_size", { size });
      await ctx.sleep(900);
    },
    states: widgetStates,
    // Each row: a state, plus the variants worth capturing for it.
    matrix: [
      { state: "idle" },
      { state: "study", hover: true, more: true, lightbg: true },
      { state: "break" },
      { state: "paused", hover: true },
      { state: "awaiting", hover: true },
      { state: "complete" },
      { state: "timer" },
    ],
    hoverPoint: [80, 24],
    // The secondary page behind the "more" control.
    openMore: (ctx) =>
      ctx.widget.eval(
        `(document.querySelector('[aria-label="More actions"]')||{click(){}}).click(); 'more'`,
      ),
    clipSelectors: [".widget-info", ".widget-readout", ".wbtn"],
    // Controls fade in on pointer hover or keyboard focus (never hover-only).
    controls: { selector: ".widget-controls", hiddenAtRest: true },
  },

  // ---- functional regression ------------------------------------------------------------------------
  functional: {
    mutates: true,
    // A genuinely fresh user: default settings, no custom presets.
    async prepare(ctx) {
      const { main, sleep } = ctx;
      const cur = await boot(ctx);
      await main.invoke("update_settings", {
        settings: {
          ...cur.settings,
          soundEnabled: true,
          volume: 0.8,
          autoAdvance: false,
          defaultVisual: "disk",
          widgetSize: "medium",
          widgetVisible: true,
          widgetAlwaysOnTop: true,
          lastStudyPresetId: null,
          lastStudyTotalMinutes: null,
          lastTimerMinutes: null,
          quitOnMainClose: false,
        },
      });
      for (const p of cur.customPresets)
        await main.invoke("delete_preset", { id: p.id });
      await main.invoke("set_widget_size", { size: "medium" });
      await main.invoke("reset_timer");
      await sleep(600);
    },
    sections: [
      {
        id: "study-plan",
        title: "Study preset, duration and plan",
        async run(ctx) {
          const { main, ok, sleep } = ctx;
          const click = (t) => main.click(t);
          await home(ctx);
          ok(
            "first view shows no duration selected + disabled CTA",
            (await main.text(".start-cta")).toLowerCase() ===
              "choose a duration" &&
              (await main.$(".start-cta", "e.disabled")) === true,
          );
          await main.pointerClick(
            '.segment:has(input[value="120"]) .segment-face',
          );
          await sleep(200);
          ok(
            "real pointer click on the '2 hours' segment selects it",
            (await main.$("input[name=study-total]:checked", "e.value")) ===
              "120",
          );
          ok(
            "2 hours -> Deep Study CTA reads 'Start 2h Deep Study'",
            (await main.text(".start-cta")).toLowerCase() ===
              "start 2h deep study",
            await main.text(".start-cta"),
          );
          const summary = (await main.text(".summary")).toLowerCase();
          ok(
            "summary says Total session 2h / Focus 1h 30m / Breaks 30m",
            summary.includes("total session 2h") &&
              summary.includes("focus 1h 30m") &&
              summary.includes("breaks 30m"),
            summary,
          );
          ok(
            "Sunline shows 4 to-scale segments (S45 B15 S45 B15)",
            (await main.$(".sunline", "e.children.length")) === 4,
          );
          await click("start 2h deep study");
          await sleep(600);
          const b = await boot(ctx);
          ok(
            "Deep Study 45/15 for 2h starts S45 B15 S45 B15",
            kinds(b.state.plan.phases) === "sbsb" &&
              mins(b.state.plan.phases).join() === "45,15,45,15",
            JSON.stringify(mins(b.state.plan.phases)),
          );
          ok(
            "engine is running study, index 0, preset name recorded",
            b.state.isRunning &&
              b.state.currentIndex === 0 &&
              b.state.plan.presetName === "Deep Study",
          );
          ok(
            "last preset + total remembered in settings",
            b.settings.lastStudyPresetId === "deep-study" &&
              b.settings.lastStudyTotalMinutes === 120,
          );
        },
      },
      {
        id: "controls",
        title: "Pause, resume, +5, skip, reset",
        async run(ctx) {
          const { main, ok, sleep } = ctx;
          const click = (t) => main.click(t);
          await click("pause");
          await sleep(250);
          let b = await boot(ctx);
          ok("Pause -> engine paused", b.state.isPaused === true);
          ok(
            "Paused surface says PAUSED and offers Resume",
            (await main.text(".eyebrow")).toLowerCase() === "paused" &&
              (await main.text(".controls-primary .btn"))
                .toLowerCase()
                .includes("resume"),
          );
          const before = b.state.pausedRemainingMs;
          await click("add 5 minutes");
          await sleep(250);
          b = await boot(ctx);
          ok(
            "+5 while paused adds exactly 5 minutes",
            b.state.pausedRemainingMs === before + 300000,
            `${before} -> ${b.state.pausedRemainingMs}`,
          );
          await click("resume");
          await sleep(250);
          b = await boot(ctx);
          ok("Resume -> running again", b.state.isRunning && !b.state.isPaused);
          await click("skip phase");
          await sleep(350);
          b = await boot(ctx);
          ok(
            "Skip phase -> break (index 1)",
            b.state.currentIndex === 1 &&
              b.state.plan.phases[1].kind === "break",
          );
          ok(
            "Break surface is labelled BREAK 1 of 2 with 'Next · Study 2 of 2' and Skip break",
            (await main.text(".eyebrow")).toLowerCase().startsWith("break") &&
              (await main.text(".stage-active"))
                .toLowerCase()
                .includes("next · study 2 of 2") &&
              (await main.text(".controls-secondary"))
                .toLowerCase()
                .includes("skip break"),
            await main.text(".eyebrow"),
          );
          await click("skip break");
          await sleep(350);
          b = await boot(ctx);
          ok(
            "Skip break -> Study block 2",
            b.state.currentIndex === 2 &&
              b.state.plan.phases[2].kind === "study",
          );
          await click("reset");
          await sleep(250);
          b = await boot(ctx);
          ok(
            "Reset needs a second press (two-step destructive)",
            b.state.isRunning === true &&
              (await main.text(".controls-secondary"))
                .toLowerCase()
                .includes("confirm reset"),
          );
          await click("confirm reset");
          await sleep(350);
          b = await boot(ctx);
          ok(
            "Confirm reset -> session cleared, back to setup",
            b.state.plan === null && (await main.$(".setup", "1")) !== null,
          );
        },
      },
      {
        id: "presets-durations",
        title: "Other presets, shortened final block, custom duration",
        async run(ctx) {
          const { main, ok, sleep } = ctx;
          const click = (t) => main.click(t);
          const closeMenu = async () => {
            await main.eval(
              `document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'})); 'e'`,
            );
            await sleep(150);
          };
          const pickPreset = async (id) => {
            await closeMenu();
            await main.pointerClick(".preset-trigger");
            await main.pointerClick(`.preset-option:has(input[value=${id}])`);
          };
          await home(ctx);
          await pickPreset("classic-pomodoro");
          ok(
            "Selecting Classic closes the menu and shows CLASSIC 25 / 5",
            (await main.$("#preset-menu", "1")) === null &&
              (await main.text(".preset-trigger"))
                .toLowerCase()
                .includes("classic") &&
              (await main.text(".preset-trigger")).includes("25 / 5"),
            await main.text(".preset-trigger"),
          );
          await click("1 hour");
          await sleep(200);
          await click("start 1h classic");
          await sleep(500);
          let b = await boot(ctx);
          ok(
            "Classic 25/5 for 1h -> S25 B5 S25 B5",
            mins(b.state.plan.phases).join() === "25,5,25,5",
            JSON.stringify(mins(b.state.plan.phases)),
          );
          await ctx.main.invoke("reset_timer");
          await sleep(350);
          await click("study");
          await pickPreset("quick");
          await click("3 hours");
          await click("start 3h quick");
          await sleep(500);
          b = await boot(ctx);
          ok(
            "Quick 15/5 for 3h uses 15/5 blocks",
            mins(b.state.plan.phases).slice(0, 4).join() === "15,5,15,5" &&
              b.state.plan.presetName === "Quick",
          );
          await home(ctx);
          await pickPreset("deep-study");
          await click("custom");
          await sleep(200);
          await main.setValue("#study-total-custom-h", "2");
          await main.setValue("#study-total-custom-m", "30");
          await sleep(250);
          const sum = (await main.text(".summary")).toLowerCase();
          ok(
            "Custom 2h 30m -> summary Total session 2h 30m, Focus 2h, Breaks 30m",
            sum.includes("total session 2h 30m") &&
              sum.includes("focus 2h") &&
              sum.includes("breaks 30m"),
            sum,
          );
          ok(
            "Sunline shows S45 B15 S45 B15 S30: 3 study blocks, shortened final one, no trailing break",
            (await main.text(".sunline")).toLowerCase().includes("study 30m") &&
              (await main.$(".sunline", "e.children.length")) === 5,
            await main.text(".sunline"),
          );
          await main.setValue("#study-total-custom-h", "0");
          await main.setValue("#study-total-custom-m", "0");
          await sleep(250);
          ok(
            "Zero duration -> inline error, CTA disabled",
            (await main.text(".field-error")) ===
              "Enter a duration greater than 0." &&
              (await main.$(".start-cta", "e.disabled")) === true,
            await main.text(".field-error"),
          );
          await main.setValue("#study-total-custom-h", "25");
          await main.setValue("#study-total-custom-m", "0");
          await sleep(250);
          ok(
            "25 hours -> inline error 'Enter 24 hours or less.'",
            (await main.text(".field-error")) === "Enter 24 hours or less.",
            await main.text(".field-error"),
          );
        },
      },
      {
        id: "custom-preset",
        title: "Custom preset: save, apply defaults, repeat last, delete",
        async run(ctx) {
          const { main, ok, sleep } = ctx;
          const click = (t) => main.click(t);
          const closeMenu = async () => {
            await main.eval(
              `document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'})); 'e'`,
            );
            await sleep(150);
          };
          const pickPreset = async (id) => {
            await closeMenu();
            await main.pointerClick(".preset-trigger");
            await main.pointerClick(`.preset-option:has(input[value=${id}])`);
          };
          await home(ctx);
          await closeMenu();
          await main.pointerClick(".preset-trigger");
          await click("custom preset");
          await sleep(300);
          await click("save preset");
          await sleep(250);
          ok(
            "empty name -> inline error, form stays",
            (await main.text("#preset-name-error")) ===
              "Enter a name for this preset.",
            await main.text("#preset-name-error"),
          );
          await main.setValue("#preset-name", "CCNA Study");
          await main.setValue("#preset-focus", "40");
          await main.setValue("#preset-break", "10");
          await click("2 hours");
          await main.eval(
            `document.querySelector('.switch input').click(); 'a'`,
          );
          await main.eval(
            `document.querySelector('input[name=preset-visual][value=sundial]').click(); 's'`,
          );
          await sleep(200);
          await click("save preset");
          await sleep(600);
          let b = await boot(ctx);
          const saved = b.customPresets.find((p) => p.name === "CCNA Study");
          ok(
            "custom preset saved with rhythm + remembered defaults",
            !!saved &&
              saved.studyMinutes === 40 &&
              saved.breakMinutes === 10 &&
              saved.defaultTotalMinutes === 120 &&
              saved.autoAdvance === true &&
              saved.visual === "sundial",
            JSON.stringify(saved),
          );
          ok(
            "saved preset becomes the selection and applies its default session (2h)",
            (await main.text(".preset-trigger"))
              .toLowerCase()
              .includes("ccna study") &&
              (await main.text(".start-cta")).toLowerCase() ===
                "start 2h ccna study",
            await main.text(".start-cta"),
          );
          await click("start 2h ccna study");
          await sleep(600);
          b = await boot(ctx);
          ok(
            "saved defaults applied at start (visual sundial, auto-advance on, S40 B10)",
            b.state.plan.visual === "sundial" &&
              b.state.plan.autoAdvance === true &&
              mins(b.state.plan.phases).slice(0, 2).join() === "40,10",
            JSON.stringify({
              v: b.state.plan.visual,
              a: b.state.plan.autoAdvance,
              m: mins(b.state.plan.phases).slice(0, 2),
            }),
          );
          await ctx.main.invoke("reset_timer");
          await sleep(350);
          await click("study");
          ok(
            "'Repeat last' is hidden when the selection already IS the last session",
            (await main.$(".setup-actions .btn--tertiary", "1")) === null,
          );
          await pickPreset("deep-study");
          ok(
            "'Repeat last · CCNA Study · 2h' appears once the selection differs",
            (await main.text(".setup-actions .btn--tertiary"))
              .toLowerCase()
              .includes("repeat last") &&
              (await main.text(".setup-actions .btn--tertiary"))
                .toLowerCase()
                .includes("ccna study"),
            await main.text(".setup-actions"),
          );
          await click("repeat last · ccna study · 2h");
          await sleep(600);
          b = await boot(ctx);
          ok(
            "Repeat last starts that exact session immediately",
            b.state.isRunning &&
              b.state.plan.presetName === "CCNA Study" &&
              mins(b.state.plan.phases).slice(0, 2).join() === "40,10",
          );
          await ctx.main.invoke("reset_timer");
          await sleep(350);
          await click("study");
          await closeMenu();
          await main.pointerClick(".preset-trigger");
          await main.pointerClick('[aria-label="Delete CCNA Study"]');
          await sleep(400);
          b = await boot(ctx);
          ok(
            "custom preset can be deleted from the selector",
            !b.customPresets.some((p) => p.name === "CCNA Study"),
          );
          await main.eval(
            `document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'})); 'e'`,
          );
        },
      },
      {
        id: "completion",
        title: "Auto-advance, completion, manual advance",
        async run(ctx) {
          const { main, ok, sleep } = ctx;
          const click = (t) => main.click(t);
          await main.invoke("reset_timer");
          await main.invoke(
            "start_session",
            quickPlan(
              [
                ["study", 1500],
                ["break", 1500],
                ["study", 1500],
              ],
              { autoAdvance: true },
            ),
          );
          await sleep(1900);
          let b = await boot(ctx);
          ok(
            "auto-advance: Study -> Break without a click",
            b.state.currentIndex === 1 &&
              b.state.isRunning &&
              !b.state.awaitingAdvance,
            JSON.stringify({ i: b.state.currentIndex }),
          );
          await sleep(3000);
          b = await boot(ctx);
          ok(
            "auto-advance: session runs to completion (plan kept, not running)",
            b.state.plan !== null && b.state.isRunning === false,
          );
          ok(
            "completion surface says SESSION COMPLETE with total + Done",
            (await main.text(".eyebrow")).toLowerCase() ===
              "session complete" &&
              (await main.text(".controls-primary .btn")).toLowerCase() ===
                "done",
            await main.text(".eyebrow"),
          );
          await click("done");
          await sleep(400);
          b = await boot(ctx);
          ok("Done returns to setup", b.state.plan === null);
          await main.invoke(
            "start_session",
            quickPlan([
              ["study", 1500],
              ["break", 15 * MIN],
            ]),
          );
          await sleep(2600);
          b = await boot(ctx);
          ok(
            "manual advance: waits at FOCUS COMPLETE with Start break",
            b.state.awaitingAdvance === true &&
              (await main.text(".eyebrow")).toLowerCase() ===
                "focus complete" &&
              (await main.text(".controls-primary .btn")).toLowerCase() ===
                "start break",
            await main.text(".eyebrow"),
          );
          await click("start break");
          await sleep(400);
          b = await boot(ctx);
          ok(
            "Start break -> running the break",
            b.state.isRunning &&
              !b.state.awaitingAdvance &&
              b.state.plan.phases[b.state.currentIndex].kind === "break",
          );
          await main.invoke("reset_timer");
          await sleep(350);
        },
      },
      {
        id: "timer",
        title: "General Timer",
        async run(ctx) {
          const { main, ok, sleep } = ctx;
          const click = (t) => main.click(t);
          await click("timer");
          await sleep(300);
          ok(
            "Timer defaults to the remembered/25 minutes and shows it as 25:00",
            (await main.text(".readout")) === "25:00",
            await main.text(".readout"),
          );
          await click("45");
          await sleep(150);
          ok(
            "choosing 45 -> readout 45:00, CTA 'Start 45 min timer'",
            (await main.text(".readout")) === "45:00" &&
              (await main.text(".start-cta")).toLowerCase() ===
                "start 45 min timer",
          );
          await main.eval(
            `document.querySelector('input[name=timer-visual][value=hourglass]').click(); 'h'`,
          );
          await click("start 45 min timer");
          await sleep(500);
          let b = await boot(ctx);
          ok(
            "General Timer 45 min, hourglass, single timer phase",
            b.state.plan.mode === "timer" &&
              mins(b.state.plan.phases).join() === "45" &&
              b.state.plan.visual === "hourglass",
          );
          ok(
            "active timer has no study metadata (no Skip, no 'Next')",
            !(await main.text(".stage-active"))
              .toLowerCase()
              .includes("next ·") &&
              !(await main.text(".controls-secondary"))
                .toLowerCase()
                .includes("skip"),
            await main.text(".stage-active"),
          );
          await main.invoke("reset_timer");
          await sleep(350);
          await click("timer");
          await sleep(200);
          await click("custom");
          await sleep(200);
          await main.setValue("#timer-custom-h", "1");
          await main.setValue("#timer-custom-m", "15");
          await sleep(200);
          ok(
            "custom timer 1h 15m -> readout 1:15:00, CTA 'Start 1h 15m timer'",
            (await main.text(".readout")) === "1:15:00" &&
              (await main.text(".start-cta")).toLowerCase() ===
                "start 1h 15m timer",
            `${await main.text(".readout")} / ${await main.text(".start-cta")}`,
          );
          await click("start 1h 15m timer");
          await sleep(400);
          b = await boot(ctx);
          ok(
            "custom timer runs 75 minutes",
            mins(b.state.plan.phases).join() === "75",
          );
          await main.invoke("start_session", timer(1500));
          await sleep(2600);
          b = await boot(ctx);
          ok(
            "timer completion: TIME'S UP + Done + +5 minutes",
            (await main.text(".eyebrow")).toLowerCase() === "time's up" &&
              (await main.text(".controls-primary"))
                .toLowerCase()
                .includes("+5 minutes"),
            await main.text(".eyebrow"),
          );
          await click("+5 minutes");
          await sleep(400);
          b = await boot(ctx);
          ok(
            "+5 minutes after completion starts a fresh 5-minute timer",
            b.state.isRunning && mins(b.state.plan.phases).join() === "5",
          );
          await main.invoke("reset_timer");
          await sleep(350);
        },
      },
      {
        id: "visuals",
        title: "The three visuals render real geometry",
        async run(ctx) {
          const { main, ok, sleep } = ctx;
          for (const v of ["disk", "hourglass", "sundial"]) {
            await main.invoke(
              "start_session",
              study(v, { phases: [phase("study", 45)] }),
            );
            await sleep(600);
            const svg = await main.$(".visual-frame--hero svg", "e.innerHTML");
            ok(
              `visual '${v}' renders real geometry (no NaN, has lit shape)`,
              !!svg &&
                !svg.includes("NaN") &&
                svg.length > 400 &&
                svg.includes("tv-"),
              `len=${svg?.length}`,
            );
          }
          await main.invoke("reset_timer");
          await sleep(350);
        },
      },
      {
        id: "settings",
        title: "Settings persistence and widget sizing",
        async run(ctx) {
          const { main, widget, ok, sleep } = ctx;
          const click = (t) => main.click(t);
          const advance = `[...document.querySelectorAll('.switch')].find(l=>l.textContent.includes('Advance')).querySelector('input').click(); 's'`;
          await click("settings");
          await sleep(400);
          const s0 = (await boot(ctx)).settings;
          await main.eval(advance);
          await sleep(350);
          ok(
            "Settings: auto-advance toggle persists to the engine",
            (await boot(ctx)).settings.autoAdvance === !s0.autoAdvance,
          );
          await main.eval(advance);
          await sleep(300);
          await main.eval(
            `document.querySelector('input[name=default-visual][value=sundial]').click(); 'v'`,
          );
          await sleep(350);
          ok(
            "Settings: default visual -> sundial persists",
            (await boot(ctx)).settings.defaultVisual === "sundial",
          );
          await main.eval(
            `document.querySelector('input[name=default-visual][value=disk]').click(); 'v'`,
          );
          await sleep(300);
          await main.setValue("#volume", "0.35");
          await sleep(350);
          ok(
            "Settings: volume persists",
            Math.abs((await boot(ctx)).settings.volume - 0.35) < 0.001,
          );
          await main.setValue("#volume", String(s0.volume));
          await sleep(250);
          const testClicks = await main.eval(
            `(async () => { let n = 0; for (const b of document.querySelectorAll('button[aria-label^="Test "]')) { b.click(); n++; await new Promise(r => setTimeout(r, 120)); } return n; })()`,
          );
          ok(
            "Settings: all 3 Test-sound buttons run without error",
            testClicks === 3,
          );
          const expected = ctx.config.windows.widget.sizes;
          for (const size of ["small", "large", "medium"]) {
            await main.eval(
              `document.querySelector('input[name=widget-size][value=${size}]').click(); 'z'`,
            );
            await sleep(1100);
            const w = await widget.eval(
              `JSON.stringify([innerWidth, innerHeight])`,
            );
            ok(
              `Settings: widget size ${size} -> widget window ${expected[size].join("x")}`,
              w === JSON.stringify(expected[size]),
              w,
            );
          }
          await main.eval(
            `document.querySelector('.close-behavior input:not(:checked)').click(); 'q'`,
          );
          await sleep(350);
          ok(
            "Settings: 'Quit SUNDIAL' on close persists",
            (await boot(ctx)).settings.quitOnMainClose === true,
          );
          await main.eval(
            `document.querySelector('.close-behavior input:not(:checked)').click(); 'k'`,
          );
          await sleep(350);
          ok(
            "Settings: back to 'Keep SUNDIAL running'",
            (await boot(ctx)).settings.quitOnMainClose === false,
          );
        },
      },
      {
        id: "widget-sync",
        title: "Widget synchronisation and controls",
        async run(ctx) {
          const { main, widget, ok, sleep } = ctx;
          await main.click("close settings");
          await main.invoke(
            "start_session",
            study("disk", { phases: [phase("study", 45), phase("break", 15)] }),
          );
          await sleep(700);
          ok(
            "widget mirrors the running session (label Study, 1 of 1 block)",
            (
              await widget.eval(
                `document.querySelector('.widget-label')?.innerText`,
              )
            ).toLowerCase() === "study",
          );
          await widget.hover(80, 24);
          await sleep(250);
          await widget.eval(
            `document.querySelector('[aria-label="Pause"]').click(); 'p'`,
          );
          await sleep(400);
          ok(
            "widget Pause -> engine paused and main window shows Paused",
            (await boot(ctx)).state.isPaused === true &&
              (await main.text(".eyebrow")).toLowerCase() === "paused",
          );
          await widget.eval(
            `document.querySelector('[aria-label="Resume"]').click(); 'r'`,
          );
          await sleep(300);
          await widget.eval(
            `document.querySelector('[aria-label="Add 5 minutes"]').click(); 'a'`,
          );
          await sleep(300);
          const b = await boot(ctx);
          ok(
            "widget Resume + +5 both reach the engine",
            b.state.isPaused === false &&
              b.state.durationMs === 2700000 + 300000,
            `${b.state.durationMs}`,
          );
          await widget.eval(
            `document.querySelector('[aria-label="More actions"]').click(); 'm'`,
          );
          await sleep(250);
          ok(
            "widget ⋯ page offers Skip, Reset, Open, Quit (+Back)",
            (await widget.eval(
              `[...document.querySelectorAll('.widget-controls button')].map(b=>b.getAttribute('aria-label')).join(',')`,
            )) === "Back,Skip phase,Reset,Open SUNDIAL,Quit SUNDIAL",
          );
          await widget.eval(
            `document.querySelector('[aria-label="Skip phase"]').click(); 's'`,
          );
          await sleep(350);
          ok(
            "widget Skip -> engine on the break",
            (await boot(ctx)).state.currentIndex === 1,
          );
          // Drag wiring: Tauri's own handler must accept a press on the surface and reject one on a button.
          await widget.hover(100, 80);
          await sleep(250);
          const drag = await widget.eval(`(() => {
            const press = (el) => { const ev = new MouseEvent('mousedown', { bubbles: true, cancelable: true, composed: true, button: 0, buttons: 1, detail: 1 }); el.dispatchEvent(ev); return ev.defaultPrevented; };
            return { surface: press(document.querySelector('.widget-drag')), button: press(document.querySelector('.wbtn')), textPassesThrough: getComputedStyle(document.querySelector('.widget-readout')).pointerEvents === 'none' };
          })()`);
          ok(
            "widget drag: Tauri accepts a press on the surface (start_dragging), rejects one on a button",
            drag.surface === true &&
              drag.button === false &&
              drag.textPassesThrough === true,
            JSON.stringify(drag),
          );
          await main.invoke("reset_timer");
          await sleep(350);
        },
      },
      {
        id: "composition",
        title:
          "v1.2 composition: Instrument Stage, promoted Visual, always-visible Sunline",
        async run(ctx) {
          const { main, ok, sleep } = ctx;
          await home(ctx);
          ok(
            "Study setup: the Visual picker is visible without opening Options",
            (await main.$(".session-composer .visual-picker", "1")) !== null,
          );
          await main.click("2 hours");
          await sleep(200);
          ok(
            "Study setup: the Sunline is visible with no click (4 segments for 2h Deep Study)",
            (await main.$(".sunline-panel .sunline", "e.children.length")) ===
              4,
          );
          await main.click("options");
          await sleep(200);
          const optionsText = (await main.text("#panel-options")).toLowerCase();
          ok(
            "Options now holds only auto-advance + label, not the Visual picker",
            optionsText.includes("advance to the next phase") &&
              optionsText.includes("label") &&
              (await main.$("#panel-options .visual-picker", "1")) === null,
            optionsText,
          );
          await main.click("options");
          await sleep(150);
          await main.click("timer");
          await sleep(250);
          ok(
            "Timer setup uses the same Instrument Stage + composer layout",
            (await main.$(".composer .instrument-stage", "1")) !== null &&
              (await main.$(".composer .session-composer", "1")) !== null,
          );
          await main.invoke("reset_timer");
          await sleep(300);
        },
      },
      {
        id: "keyboard-focus-display",
        title:
          "Keyboard layer (Space/+/S/F/Esc), suppressed while typing, and Focus Display",
        async run(ctx) {
          const { main, ok, sleep } = ctx;
          await main.invoke("reset_timer");
          await main.invoke("start_session", study("disk"));
          await sleep(400);

          await main.key("f");
          await sleep(350);
          const fdPresent = (await main.$(".focus-display", "1")) !== null;
          const fdEyebrow = fdPresent
            ? (await main.text(".focus-display .eyebrow")).toLowerCase()
            : null;
          ok(
            "F enters Focus Display: a full-bleed overlay over the same running session",
            fdPresent && (fdEyebrow ?? "").includes("study"),
            `present=${fdPresent} eyebrow=${JSON.stringify(fdEyebrow)}`,
          );
          await main.key("Escape");
          await sleep(300);
          ok(
            "Escape exits Focus Display back to the normal shell",
            (await main.$(".focus-display", "1")) === null &&
              (await main.$(".app-header", "1")) !== null,
          );

          await main.key("Space");
          await sleep(300);
          let b = await boot(ctx);
          ok("Space pauses the running session", b.state.isPaused === true);
          await main.key("Space");
          await sleep(300);
          b = await boot(ctx);
          ok("Space again resumes it", b.state.isPaused === false);

          const before = b.state.durationMs;
          await main.key("+");
          await sleep(300);
          b = await boot(ctx);
          ok(
            "+ adds exactly 5 minutes",
            b.state.durationMs === before + 300_000,
            `${before} -> ${b.state.durationMs}`,
          );
          await main.key("s");
          await sleep(350);
          b = await boot(ctx);
          ok("S skips to the next phase", b.state.currentIndex === 1);

          await main.invoke("reset_timer");
          await sleep(300);
          await main.click("study");
          await main.click("options");
          await sleep(200);
          await main.eval(
            `document.querySelector('#session-label').focus(); 'f'`,
          );
          await main.key("s");
          await sleep(150);
          ok(
            "shortcuts are suppressed while a text field has focus: 's' is typed, not Skip",
            (await main.$("#session-label", "e.value")) === "s",
          );
          await main.eval(
            `document.querySelector('#session-label').blur(); 'b'`,
          );
        },
      },
    ],
  },

  // ---- accessibility ----------------------------------------------------------------------------------
  accessibility: {
    surfaces: [
      { surface: "study-setup", label: "study-setup" },
      { surface: "timer-setup", label: "timer-setup" },
      { surface: "settings", label: "settings", maxStops: 30 },
      { surface: "custom-preset", label: "custom-preset", maxStops: 24 },
      {
        surface: "active-hourglass",
        label: "active",
        maxStops: 12,
        describe: readoutProbe,
      },
      { surface: "focus-display", label: "focus-display", maxStops: 10 },
    ],
    // App-specific keyboard behaviour, run after entering the named surface.
    keyboard: [
      {
        id: "preset-menu",
        surface: "study-setup",
        async run(ctx, report) {
          const { main, ok, sleep } = ctx;
          await main.eval(
            `document.querySelector('.preset-trigger').focus(); 'f'`,
          );
          await main.key("Enter");
          await sleep(250);
          const opened = await main.eval(
            `!!document.querySelector('#preset-menu')`,
          );
          const focusedInMenu = await main.eval(
            `!!document.activeElement?.closest?.('#preset-menu')`,
          );
          await main.key("ArrowDown");
          await sleep(150);
          const next = await main.eval(
            `document.querySelector('.preset-trigger .type-display').textContent`,
          );
          await main.key("Escape");
          await sleep(200);
          const closed = await main.eval(
            `!document.querySelector('#preset-menu')`,
          );
          const focusReturned = await main.eval(
            `document.activeElement?.classList?.contains('preset-trigger')`,
          );
          report.presetMenu = {
            opensOnEnter: opened,
            focusMovesIn: focusedInMenu,
            arrowSelectsNext: next,
            escapeCloses: closed,
            focusReturnsToTrigger: focusReturned,
          };
          ok(
            "preset menu opens on Enter and moves focus inside",
            opened && focusedInMenu,
          );
          ok(
            "preset menu: ArrowDown selects the next rhythm",
            next === "Classic",
            next,
          );
          ok(
            "preset menu: Escape closes it and focus returns to the trigger",
            closed && focusReturned,
          );
        },
      },
      {
        id: "segmented-arrows",
        surface: "study-setup",
        async run(ctx, report) {
          const { main, ok, sleep } = ctx;
          await main.eval(
            `document.querySelector('input[name=study-total]:checked')?.focus(); 'f'`,
          );
          await main.key("ArrowRight");
          await sleep(150);
          report.segmentedArrow = await main.eval(
            `document.querySelector('input[name=study-total]:checked')?.value`,
          );
          ok(
            "segmented duration: ArrowRight from 2h selects 3h (180)",
            report.segmentedArrow === "180",
            String(report.segmentedArrow),
          );
        },
      },
    ],
    // The readout must be announced (role/label/live) and use tabular numerals.
    describeExpect(described, ok) {
      ok(
        "readout is role=timer with a spoken label, polite live eyebrow and tabular numerals",
        described.role === "timer" &&
          /remaining/.test(described.label ?? "") &&
          described.live === "polite" &&
          described.tabular === "tabular-nums",
        JSON.stringify(described),
      );
    },
    reducedMotion: {
      extra: motionExtra,
      states: [
        {
          id: "normal, running",
          reduced: false,
          enter: (ctx) => ctx.enter("active-hourglass"),
          expect: { infinite: 0, extra: { stream: true } },
        },
        {
          id: "normal, paused",
          reduced: false,
          enter: (ctx) => ctx.enter("paused"),
          expect: { infinite: 0, extra: { stream: false } },
        },
        {
          id: "reduced, running",
          reduced: true,
          enter: (ctx) => ctx.enter("active-hourglass"),
          expect: { running: 0, infinite: 0, extra: { stream: false } },
        },
      ],
    },
    widget: { restState: "study" },
  },

  // ---- responsive ---------------------------------------------------------------------------------------
  responsive: {
    surfaces: [
      "study-setup",
      "study-options",
      "timer-setup",
      "timer-setup-custom",
      "active-sundial",
      "active-hourglass",
      "paused",
      "settings",
    ],
    // Surfaces that are expanded on purpose (or need scrolling by design); informational, not a failure.
    scrollsByDesign: ["study-options", "settings"],
  },

  // ---- performance --------------------------------------------------------------------------------------
  // Budgets are % of ONE core summed over the app and its WebView2 processes (both windows). They are
  // deliberately generous (typical: 4-9% running, <2% idle); the defect they guard against was ~100%.
  performance: {
    // A defect the CPU gate must catch: the first hourglass used an animated SVG stroke, which repainted the
    // whole drawing every frame and cost about 100% of a core. shared/detector-check.mjs --perf injects it.
    defect: {
      state: "hourglass running",
      css: "@keyframes qa-hot { to { stroke-dashoffset: -16 } } .tv-hourglass svg * { stroke: currentColor; stroke-dasharray: 3 5; animation: qa-hot 0.9s linear infinite !important; }",
    },
    states: [
      {
        id: "idle",
        enter: (ctx) => ctx.main.invoke("reset_timer"),
        budget: 10,
      },
      {
        id: "disk running",
        enter: (ctx) => ctx.main.invoke("start_session", study("disk")),
        budget: 30,
      },
      {
        id: "sundial running",
        enter: (ctx) => ctx.main.invoke("start_session", study("sundial")),
        budget: 30,
      },
      {
        id: "hourglass running",
        enter: (ctx) => ctx.main.invoke("start_session", study("hourglass")),
        budget: 30,
      },
      {
        id: "hourglass paused",
        enter: (ctx) => ctx.main.invoke("pause_timer"),
        budget: 10,
      },
    ],
  },

  // ---- lifecycle (native launch / quit / restore) ------------------------------------------------------------
  lifecycle: {
    settleMs: 4000,
    scenarios: [
      {
        id: "settings-quit",
        title:
          "Settings -> Quit SUNDIAL ends the process, the widget and the tray",
        expect: "exit",
        async trigger(ctx) {
          await ctx.main.click("settings", "button");
          await ctx.sleep(500);
          await fireAndForget(
            ctx.main,
            `(() => { const b = [...document.querySelectorAll('button')].find(e => e.textContent.trim().toLowerCase() === 'quit sundial'); if (!b) return 'NOT_FOUND'; b.click(); return 'clicked' })()`,
          );
        },
      },
      {
        id: "widget-quit",
        title: "Widget -> More actions -> Quit SUNDIAL",
        expect: "exit",
        async trigger(ctx) {
          await ctx.widget.eval(
            `(document.querySelector('[aria-label="More actions"]')||{click(){}}).click(); 'ok'`,
          );
          await ctx.sleep(500);
          await fireAndForget(
            ctx.widget,
            `(() => { const b = document.querySelector('[aria-label="Quit SUNDIAL"]'); if (!b) return 'NOT_FOUND'; b.click(); return 'clicked' })()`,
          );
        },
      },
      {
        id: "close-main-quit-on-close",
        title: "'Quit on close' + native window close ends the process",
        expect: "exit",
        async prepare(ctx) {
          ctx.ok(
            "choose 'Quit SUNDIAL when the main window closes'",
            await setCloseBehavior(ctx, true),
          );
        },
        win32: "close-main",
      },
      {
        id: "close-main-keep-running",
        title:
          "'Keep running' + native window close hides to the tray; the widget stays",
        expect: "keep-running",
        visibleWindows: 1,
        async prepare(ctx) {
          ctx.ok(
            "choose 'Keep SUNDIAL running'",
            await setCloseBehavior(ctx, false),
          );
        },
        win32: "close-main",
        // Then finish the session the way a user would.
        async then(ctx) {
          await ctx.widget.eval(
            `(document.querySelector('[aria-label="More actions"]')||{click(){}}).click(); 'ok'`,
          );
          await ctx.sleep(500);
          await fireAndForget(
            ctx.widget,
            `(() => { const b = document.querySelector('[aria-label="Quit SUNDIAL"]'); if (!b) return 'NOT_FOUND'; b.click(); return 'clicked' })()`,
          );
        },
        thenExpect: "exit",
      },
    ],

    // Persisted sessions, crafted on disk, then a cold start: what does the app show?
    restore: {
      states: [
        "running",
        "paused",
        "finished-study",
        "finished-timer",
        "awaiting",
        "slept-through",
      ],
      /** Write the named state into the (stopped) app's state file. */
      craft({ name, stateFile, fs }) {
        const data = JSON.parse(fs.readFileSync(stateFile, "utf8"));
        const now = Date.now();
        const plan = (over = {}) => ({
          mode: "study",
          label: null,
          visual: "sundial",
          autoAdvance: false,
          presetName: "Deep Study",
          phases: [phase("study", 45), phase("break", 15), phase("study", 45)],
          ...over,
        });
        const base = {
          plan: null,
          currentIndex: 0,
          startedAt: null,
          endsAt: null,
          durationMs: 0,
          pausedAt: null,
          pausedRemainingMs: null,
          isPaused: false,
          isRunning: false,
          awaitingAdvance: false,
        };
        const states = {
          running: {
            ...base,
            plan: plan(),
            startedAt: now - 10 * MIN,
            endsAt: now + 35 * MIN,
            durationMs: 45 * MIN,
            isRunning: true,
          },
          paused: {
            ...base,
            plan: plan(),
            currentIndex: 2,
            durationMs: 45 * MIN,
            isRunning: true,
            isPaused: true,
            pausedAt: now - 3 * MIN,
            pausedRemainingMs: 18 * MIN + 42_000,
          },
          "finished-study": {
            ...base,
            plan: plan({ phases: [phase("study", 45), phase("break", 15)] }),
            currentIndex: 1,
            startedAt: now - 40 * MIN,
            endsAt: now - 25 * MIN,
            durationMs: 15 * MIN,
            isRunning: true,
          },
          "finished-timer": {
            ...base,
            plan: plan({
              mode: "timer",
              presetName: null,
              visual: "hourglass",
              autoAdvance: true,
              phases: [phase("timer", 30)],
            }),
            startedAt: now - 50 * MIN,
            endsAt: now - 20 * MIN,
            durationMs: 30 * MIN,
            isRunning: true,
          },
          awaiting: {
            ...base,
            plan: plan(),
            startedAt: now - 47 * MIN,
            endsAt: now - 2 * MIN,
            durationMs: 45 * MIN,
            isRunning: true,
          },
          "slept-through": {
            ...base,
            plan: plan({ autoAdvance: true }),
            startedAt: now - 70 * MIN,
            endsAt: now - 25 * MIN,
            durationMs: 45 * MIN,
            isRunning: true,
          },
        };
        if (!states[name]) throw new Error(`unknown restore state ${name}`);
        data.state = states[name];
        fs.writeFileSync(stateFile, JSON.stringify(data, null, 2));
      },
      /** What the person sees, plus the engine's view, after the cold start. */
      async observe(ctx) {
        const engine = await boot(ctx);
        const main = await ctx.main.eval(
          `(() => ({ eyebrow: document.querySelector('.eyebrow')?.innerText ?? null, notice: document.querySelector('.notice')?.innerText?.replace(/\\s+/g, ' ') ?? null, readout: document.querySelector('.readout')?.innerText ?? null, primary: document.querySelector('.controls-primary .btn')?.innerText ?? null, setup: !!document.querySelector('.setup') }))()`,
        );
        return {
          engine: {
            isRunning: engine.state.isRunning,
            isPaused: engine.state.isPaused,
            awaiting: engine.state.awaitingAdvance,
            index: engine.state.currentIndex,
            hasPlan: !!engine.state.plan,
          },
          main,
        };
      },
      // What must be true for each state. Never a stale running timer for a finished session.
      expect: {
        running: (o) =>
          o.engine.isRunning &&
          !o.engine.isPaused &&
          /restored/i.test(o.main.notice ?? ""),
        paused: (o) =>
          o.engine.isPaused && /restored/i.test(o.main.notice ?? ""),
        "finished-study": (o) =>
          !o.engine.isRunning && /finished/i.test(o.main.eyebrow ?? ""),
        "finished-timer": (o) =>
          !o.engine.isRunning && /finished/i.test(o.main.eyebrow ?? ""),
        awaiting: (o) =>
          o.engine.awaiting && /focus complete/i.test(o.main.eyebrow ?? ""),
        "slept-through": (o) => o.engine.isRunning && o.engine.index === 2,
      },
    },
  },
};
