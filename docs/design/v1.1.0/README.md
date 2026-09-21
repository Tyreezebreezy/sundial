# SUNDIAL v1.1.0 - UI/UX refactor evidence

Baseline: `v1.0.1` (commit `fbbf8f6`, screenshots in `../v1.0.1-baseline/`).
Result: `v1.1.0`. The design system is described in `../DESIGN_CONTRACT.md`.

Everything below was produced by driving the real native app (Tauri + WebView2),
not a browser mock. Nothing here ships in the installer.

## Contents

| Path                                  | What it is                                                                                                                                                            |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `01-...` to `16-*.png`                | Main-window surfaces at 900x760. `01-12` use the same names as the baseline so they pair one-to-one.                                                                  |
| `widget-{small,medium,large}-*.png`   | Every widget state at every size, on a dark and a light backdrop, resting and hovered.                                                                                |
| `compare-1..4-*.png`                  | Before/after boards: v1.0.1 (left) beside v1.1.0 (right), same surface and dimensions.                                                                                |
| `responsive-*.png`                    | Contact sheets from the responsive matrix (640x560, 1920x1080, 125% / 150% / 200% scaling).                                                                           |
| `production/`                         | Smoke test of the shipped release binary: screenshots, `smoke-results.txt`, large-display captures.                                                                   |
| `metrics.json`                        | Per-surface scroll size from the capture run. Its `interactive` count under-counts v1.1.0 (it skipped visually hidden native radios); use `qa/controls-recount.json`. |
| `qa/functional-matrix.txt`            | The 64-check functional regression matrix (real clicks, engine state asserted).                                                                                       |
| `qa/a11y.json`, `qa/a11y-summary.txt` | Accessibility-tree, tab-order, focus-ring, keyboard and reduced-motion audit.                                                                                         |
| `qa/responsive.json`                  | 56 surface/viewport combinations: overflow, clipping, target sizes.                                                                                                   |
| `qa/controls-recount.json`            | Fair control recount used in the table below.                                                                                                                         |

Notes on reading the screenshots:

- Focus-complete and session-complete shots use a 1.5 second block so the harness does not wait
  for a real 45 minute block: their numerals read `00:02` / `0m`. In use they show the length of
  the block just finished (for example `45:00`) and the session total.
- Widget `*-more` and `*-lightbg` shots show a gold ring (or visible controls) because the harness
  left keyboard focus in the widget from the previous step. That is what keyboard focus looks like.

## How it was verified

- **Isolated dev instance** (`tauri dev` with a temporary app identifier, so the real SUNDIAL's data was
  never touched) driven over WebView2 remote debugging: `Runtime.evaluate` and the real IPC bridge for
  state, `Input.dispatch*` for pointer and keyboard, `Page.captureScreenshot`, the accessibility tree,
  `Emulation` for viewport, pixel ratio and `prefers-reduced-motion`.
- **Shipped release binary** (`target/release/sundial.exe`, real identifier) for the final smoke test. The
  user's real state file was backed up first; after the run its SHA-256 matched the backup byte for byte (the
  app did rewrite it during the run - its modified time changed - but the last setting change reverted the
  earlier one, so the content is identical).
- Deterministic gates run on every `npm run check`: `tests/design-system.test.mjs` (contrast, tokens,
  type/spacing/radius/motion, no infinite animation), `tests/ui-logic.test.mjs`, `tests/widget-view.test.mjs`,
  `tests/session.test.mjs`.

## Results

### Functional regression matrix - 64 / 64 PASS

Deep Study 45/15, Classic 25/5, Quick 15/5 (3h), custom preset (create, validate, save with defaults, apply,
delete), session length calculation including the shortened final block with no trailing break,
View plan, Start / Pause / Resume / +5 / Skip / Reset, Study -> Break -> Study, auto-advance to completion,
manual advance (waits at Focus complete), session completion and Done, Repeat last, General Timer (preset and
custom), completion and +5 minutes, all three visuals, Settings persistence (auto-advance, visual, volume, sound
test, widget size, quit-on-close), widget mirroring, widget Pause / Resume / +5 / Skip, widget drag wiring.
Full list: `qa/functional-matrix.txt`. Rust: 22 tests (13 before). Node: 37 tests (9 before).

### Shipped-binary smoke test - 17 / 17 PASS (`production/smoke-results.txt`)

Boots with both windows; restores persisted settings; Study setup and contextual CTA; a real pointer click
starts a Deep Study session; block label, spoken readout, widget mirroring; Pause and Resume; Disk, Sundial and
Hourglass render real geometry; the active surface stays a centred column at 2560x1440 and 3840x2160.

Quit paths, each on the shipped binary (all leave no `sundial.exe` and no SUNDIAL WebView2 process):

| Path                                                                 | Result                                                                           |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Settings -> Quit SUNDIAL                                             | PASS - process, widget and WebView2 processes gone                               |
| Widget -> More actions -> Quit SUNDIAL                               | PASS                                                                             |
| "Quit SUNDIAL when the main window closes" + native close (WM_CLOSE) | PASS - setting also persisted across a restart                                   |
| "Keep SUNDIAL running" + native close                                | PASS - process stays, only the widget window remains, then quit via widget       |
| Tray menu -> Quit SUNDIAL                                            | **Not exercised.** Same `quit_app` code path; `lib.rs` is unchanged since v1.0.1 |

### Accessibility (`qa/a11y.json`) - PASS

0 unnamed interactive elements on every surface (study setup 11, timer setup 19, settings 21, custom preset 17,
active 5, widget 3); every tab stop has a visible >= 2px ring; the preset list opens on Enter, arrows change the
selection, Escape closes and returns focus; the segmented duration control responds to arrow keys; the readout is
`role="timer"` with a spoken label ("44 minutes 59 seconds remaining") and tabular numerals; widget controls are
hidden until pointer or keyboard focus and are reachable by Tab. Reduced motion: no running animations, and the
hourglass stream is not rendered (running: rendered; paused: not; reduced motion: not).

### Responsive (`qa/responsive.json`) - 56 combinations, 0 flags

Surfaces: study setup, setup with Options open, timer setup (custom fields open), active hourglass, active sundial,
paused, settings. Viewports: 640x560, 900x760, 1200x900, 1920x1080, 900x760 at 125% and 150% pixel ratio, and 200%
zoom of both the default and minimum window. No horizontal overflow, clipped or truncated text, and no interactive
element under 24x24. Vertical scrolling is only needed where the surface is expanded on purpose (Options open,
Settings) and at 200% zoom.

### Performance (dev build, one sample each, % of one core summed over the app and its 7 WebView2 processes)

| State                                | Dev (debug) build | Shipped release binary |
| ------------------------------------ | ----------------- | ---------------------- |
| Idle, no session                     | 0.2%              | 1.3%                   |
| Disk running (main + widget windows) | 4.2%              | 4.6%                   |
| Sundial running                      | 5.2%              | 4.2%                   |
| Hourglass running                    | 7.8%              | 8.6%                   |
| Hourglass paused                     | 0.3%              | 0.6%                   |

Found and fixed in this refactor: the first hourglass stream (an animated SVG stroke) used about 100% of a core;
moving it to an HTML overlay with a compositor transform loop measured about 60%; driving it from the timer's own
200 ms tick (four steps, no animation loop) brought it to the figures above. v1.0.1 was not measured, so there is no
before figure. The hourglass still costs about twice the other visuals.

Bundle: JS 230.3 kB -> 249.1 kB (gzip 76.3 kB), CSS 7.4 kB -> 29.2 kB (gzip 5.6 kB). Installer 2,080,232 -> 2,092,067 bytes.

## Before / after findings

**Hierarchy.** v1.0.1's active screen put a small numeral inside the disk with four equal-weight buttons under it.
v1.1.0 makes the visual and a 300-weight numeral (up to 6.5rem) the subject, then the next phase, then Pause / +5,
then quiet Skip and Reset (`compare-2-active.png`, `compare-3-complete.png`).

**Visual noise and the reduced-complexity goal.** Interactive controls on first render (fair recount: a native
radio or checkbox counts once, whether or not its input is visually hidden; navigation included):

| Surface                  | v1.0.1 | v1.1.0 | Note                                                                        |
| ------------------------ | ------ | ------ | --------------------------------------------------------------------------- |
| Study setup              | 22     | 11     | 19 -> 8 excluding the 3 navigation controls                                 |
| Timer setup              | 17     | 17     | same count; ten lengths now sit in two rows and the surface fits one screen |
| Active study             | 4      | 5      | +1 is the always-available Settings button; the four actions are unchanged  |
| Focus complete           | 1      | 3      | Start break, End session, Settings                                          |
| Session / timer complete | 22     | 2 / 3  | v1.0.1 returned to the setup screen; there is now a completion surface      |
| Settings                 | 19     | 21     | v1.0.1 count is the visible part of a scrolling pane; not comparable        |

The primary Study screen has fewer simultaneous decisions (the requirement), Timer setup is unchanged in count, and
Settings has slightly more because the Test buttons and close-behaviour choices are visible rather than clipped.

**Setup speed (clicks).** Returning user starting the remembered session: 1 (Start) in both versions. Changing the
duration: 1 in both. Changing to a non-remembered preset: **2 in v1.1.0** (open the selector, choose) versus 1 in
v1.0.1 - the cost of progressive disclosure. Brand-new user: 2 (choose a duration, Start) by design, because no
duration is preselected. No timing study was done.

**Token drift** (stylesheets, comments stripped):

| Metric                                   | v1.0.1          | v1.1.0                                  |
| ---------------------------------------- | --------------- | --------------------------------------- |
| CSS lines (non-blank)                    | 465             | 1,494 (includes the 88-line token file) |
| Raw color literals outside a token file  | 10              | 0                                       |
| Distinct color values                    | 10              | 13, all in `tokens.css`                 |
| Distinct font sizes                      | 11 (raw)        | 7, all from 10 named roles              |
| Font weights                             | 600 / 700 / 800 | 300 / 400 / 600                         |
| Distinct border-radius values            | 6               | 5 (named roles)                         |
| Spacing declarations off the 4-64 rhythm | 31              | 0                                       |
| `box-shadow` declarations                | 1               | 2 (preset menu; selected-choice marker) |
| Infinite animations                      | 1               | 0                                       |

The stylesheet is about three times larger. Part of that is new surfaces and states that did not exist (completion
surfaces, plan timeline, options panel, custom-preset form, widget states at three sizes, three redrawn visuals);
the rest is the cost of explicit roles and states. This is a real cost of the refactor, not a reduction.

**Gold budget (informational).** Share of pixels in a gold hue band (28-55 degrees, saturation >= .35, value >= .45):

| Surface          | v1.0.1 | v1.1.0 | Surface          | v1.0.1 | v1.1.0 |
| ---------------- | ------ | ------ | ---------------- | ------ | ------ |
| Study setup      | 4.4%   | 4.6%   | Paused           | 5.8%   | 2.0%   |
| Timer setup      | 4.1%   | 4.4%   | Break            | 5.9%   | 4.4%   |
| Active (disk)    | 5.8%   | 4.5%   | Focus complete   | 6.7%   | 1.4%   |
| Active (sundial) | 0.2%   | 1.4%   | Session complete | 4.4%   | 1.2%   |

Setup screens are essentially unchanged (the Start button is the single largest gold area in both). The reduction is
in the states that should be quieter (paused, break, complete; v1.0.1 showed the setup screen after a session
completed, so that row is not like for like). The Sundial gets more gold on purpose: it is the signature visual.
This is a pixel statistic, not a perceptual study.

**Product identity.** The signature Sundial (asymmetric tapered shadow from a two-tone gnomon, warm opposite light,
gold rim for remaining time), light numerals with tabular figures, and one consistent state grammar across all three
visuals and the widget replace a generic dark UI with gold buttons. This is a judgment from the screenshots; there was
no outside review.

## Visual QA matrix (PASS / REVIEW / FAIL / N/A)

| Surface                                   | Status | Note                                                                                                                                                    |
| ----------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Study Setup, Session Plan                 | PASS   |                                                                                                                                                         |
| Preset Selector                           | PASS   | Real-pointer selection bug found and fixed (below)                                                                                                      |
| Custom Preset                             | PASS   |                                                                                                                                                         |
| Active Study - Disk / Hourglass / Sundial | PASS   |                                                                                                                                                         |
| Paused, Break, Focus Complete             | PASS   |                                                                                                                                                         |
| Session Complete                          | PASS   |                                                                                                                                                         |
| Timer Setup, Active Timer, Timer Complete | PASS   | Custom state initially pushed Start below the fold at 900x760; fixed (below)                                                                            |
| Settings                                  | REVIEW | One scrolling surface by design; needs vertical scroll at every size tested, including 1080 tall                                                        |
| Small / Medium / Large widget             | PASS   | Dark and light backdrops; states Idle, Study, Break, Paused, Awaiting, Complete                                                                         |
| Widget on a real desktop at OS scaling    | REVIEW | Pixel-ratio emulation only; OS scaling not changed                                                                                                      |
| Widget physical drag                      | REVIEW | Tauri's drag handler is proven to accept a press on the surface and reject one on a button; an actual OS mouse drag moving the window was not exercised |
| Toast notifications on screen             | REVIEW | Copy is unit-tested in Rust; a toast was not observed                                                                                                   |
| Audible sounds                            | REVIEW | Test buttons run without error; sound output was not heard                                                                                              |

## Regressions found and fixed (real issues, found by running the app)

1. Border contrast token measured 2.99:1 against a 3:1 requirement (the design-system test caught it); lightened.
2. Preset menu: a real pointer click closed the menu without selecting. Closing from a label click unmounted the input
   before the browser forwarded the click. Fixed by making the radio input itself the click target.
3. Small widget truncated its label ("FOCUS COM...") and wrapped "START BREAK"; the "..." page and one control
   overflowed their slots. All fixed in the widget layout.
4. Timer setup overflowed vertically at the minimum window; and (found in the last pass) with the Custom fields open
   the Start button sat below the fold even at 900x760. Fixed with a two-row, five-column length grid: the whole
   surface now fits at 640x560 and 900x760 with Custom open.
5. Sundial read too dark; Settings had inconsistent size labels and too much length; the custom-preset form was misaligned;
   volume slider and radio targets were too small; a 320px layout overflowed.
6. Truthfulness: the recovery path reconciles elapsed time before the UI first asks, so "finished while closed" cannot be
   detected. The UI now says "Session restored." for running/paused/waiting sessions and "Your session finished" on
   launching onto a finished one, rather than claiming to know when it finished. The recovery algorithm is untouched.
7. Performance: hourglass stream at about 100% of a core (see Performance).
8. Dead code and tokens removed: `formatClock`, `polarToCartesian`, `--shadow-widget`, `--motion-loop`, one needless export.
9. `cargo fmt --check` failed on two spots in `commands.rs`; fixed.

Harness artifacts that looked like bugs but were not (stale hover state, Enter needing a text value in synthetic key
events, programmatic clicks not emulating a pointer, leftover keyboard focus) were corrected in the harness, not the app.

## Deviations from the handoff (all deliberate)

- **No "+5 More Minutes" at Focus complete.** The engine cannot extend a phase that has already completed; adding it needs
  a backend change and a new behaviour.
- **No "Default preset" row in Settings.** The last-used preset and duration are already remembered; a separate default is a new
  persisted behaviour.
- **"Repeat last" only appears when it differs from the current selection** (otherwise it duplicates Start).
- **Reset and End session are two-step** (arm, then confirm) instead of one press; they are quiet, low-weight controls next to
  Skip, and a mis-click discards a running session.
- **No "Break starting 3-2-1" countdown** (marked optional) and no optional break copy ("Stand up...").
- **Restore is a notice, not a "SESSION RESTORED / Resume" screen.** A restored running session is still running (wall-clock
  authority), so a Resume step would misdescribe it.
- **Widget: small is 272 px wide (was 150), opaque graphite with a hairline border (no transparency, no shadow).** The small
  widget's v1.0.1 size clipped its own content.
- **Backend changes** (documented in the design contract, section 12): optional per-preset defaults, next-step notification copy,
  widget window sizes, dark window theme. Timer, persistence, recovery, audio and quit logic are untouched.
- **Component boundaries follow this repo**: one `ActiveSession` covers study, break, paused, waiting and finished rather than
  separate `ActiveStudy` / `BreakState` / `SessionComplete` files.

## Not verified

- Tray-menu Quit through the native tray menu (see the quit table).
- OS-level Windows scaling; only pixel-ratio emulation (100 / 125 / 150 / 200%).
- 2560x1440 and 3840x2160 were checked for layout by viewport emulation on a smaller physical display.
- Real sleep/wake reconciliation (engine unchanged; covered by Rust tests, not exercised on hardware).
- Toast appearance, audible sound, and physical widget drag (see the visual QA matrix).
- No user study; "faster", "clearer" and "more distinctive" are review judgments backed by the counts above.

## The twelve evaluation questions

1. **Can a returning user start Deep Study faster?** Not in click count for the remembered case (1 Start in both), but the
   screen is calmer (8 decisions against 19) and the CTA names what it starts ("Start 2h Deep Study"). Switching to another
   preset costs one more click than v1.0.1.
2. **Is session-duration meaning immediately clear?** Yes. "How long are you studying?" with an explicit "Total session 2h" and
   Focus / Breaks / Study blocks beneath, and a to-scale plan on demand. v1.0.1 labelled the row "Total duration" with a chip strip.
3. **Is the timer the visual focus?** Yes on every active surface: hero visual plus a light numeral up to 6.5rem; nothing else competes.
4. **Is gold more controlled?** Yes by rule and by measurement in the quiet states (paused 5.8% -> 2.0%, focus complete 6.7% -> 1.4%);
   on setup screens the Start button is still the largest gold area, as before.
5. **Are there fewer unnecessary containers?** Yes: preset cards and boxed settings sections became a trigger, a menu and
   hairline-separated sections; no nested cards.
6. **Does Break feel calmer without looking like another app?** Yes: same visual and type, lower illumination and a neutral eyebrow.
7. **Does the widget feel like desktop instrumentation?** Yes in the screenshots (time and visual at rest, controls on hover; the
   v1.0.1 small widget clipped and scrolled). Not lived with on a real desktop, so REVIEW.
8. **Are all three timer visuals clearly distinct?** Yes: a solid sector, a bulb silhouette with falling sand, and a dial with a
   gnomon shadow and rim arc; the picker shows each.
9. **Does the UI remain keyboard accessible?** Yes; see the audit.
10. **Is every existing functional workflow preserved?** Yes per the 64-check matrix, the shipped-binary smoke test, and 22 + 37
    automated tests, with the deliberate deviations above (notably two-step Reset).
11. **Does SUNDIAL now have a recognizable visual identity?** I believe so (Sundial, light numerals, one state grammar), but it is a
    self-assessment.
12. **Did the newer Forge design system materially improve the product?** Partly, and the parts are separable:
    - _Measurably yes_: a token architecture with a contrast/drift gate (0 raw colors outside tokens against 10, 0 off-rhythm spacing
      against 31, one real contrast failure caught automatically), one state grammar shared by three visuals and the widget, and a
      design contract that makes the next change cheaper to judge.
    - _Not from the gates_: the defects that mattered to a user (the preset click bug, the widget clipping, the hourglass CPU cost,
      the below-the-fold Start button) were found by driving the real native app, not by the deterministic checks, which cannot
      judge layout or feel.
    - _Cost_: a threefold larger stylesheet, a larger bundle, and a long session. For an app with visible UI debt the process is worth
      repeating; keep the token gate, the contract and the native-app harness, and treat the gates as necessary but not sufficient.
