# Visual QA harness

Reusable QA tooling for Forge-built Windows desktop apps (Tauri 2 on WebView2). It drives the
**real, running app** - not a browser mock - with real pointer and keyboard input, reads the app's
own state through its IPC bridge, measures layout and CPU, and captures screenshots. It was built
during the SUNDIAL v1.1.0 UI/UX refactor and kept here so the same loop can be run on REDLINE, MUSE,
ATLAS, LEXICON and any other app built the same way.

Nothing in this folder ships in the installer, and nothing in it is app code: the runners know nothing
about SUNDIAL. Everything app-specific lives in two files under `config/`.

## Why this exists

The process worth carrying forward is not "Forge rules, then a prettier UI". It is:

> Forge contract -> deterministic gates -> native visual workbench -> interaction/performance QA -> refinement

The SUNDIAL pilot showed the two middle layers do **different jobs**:

| Layer                                                                  | Caught in the pilot                                                                                                                                                                                                   |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deterministic gates (`npm run check`: design-system tests, unit tests) | token drift, a control border below 3:1 contrast, reduced-motion support, design-system consistency                                                                                                                   |
| Live harness (this folder)                                             | the preset menu that closed without selecting on a real click, small-widget overflow and clipping, the Hourglass animation costing about 100% of a CPU core, the Start button falling below the fold with Custom open |

Neither substitutes for the other: gates cannot judge layout or feel, and a live run cannot enforce a
token contract on every future change.

## Layout

```
qa-harness/
├── README.md
├── config/
│   ├── sundial.config.json      app identity, windows, sizes, viewports, probe selectors   (data)
│   ├── sundial.spec.mjs         SUNDIAL scenarios: surfaces, widget states, functional flows (code)
│   ├── template.config.json     copy these two to start a new app
│   └── template.spec.mjs
├── shared/                      CDP client, window helpers, in-page probes, config loader, run bootstrap
│   ├── cdp.mjs  win.mjs  probes.mjs  config.mjs  cli.mjs  results.mjs  native.mjs  run.mjs
│   ├── selfcheck.mjs            deterministic check of the harness itself (no app needed)
│   └── detector-check.mjs       injects known defects to prove the detectors detect (needs the app)
├── native/                      Windows-native: launch/stop/inspect instances, Win32 windows, state backup
│   └── instance.ps1  win32.ps1  common.ps1
├── capture/capture.mjs          evidence capture: every surface, every widget state x size
├── functional/
│   ├── run.mjs                  real-input flows asserting on the app's own state
│   └── lifecycle.mjs            launch / quit / restore (native process and window checks)
├── accessibility/run.mjs        accessible names, Tab order + focus rings, keyboard, reduced motion
├── responsive/run.mjs           every surface x every viewport: overflow, clipping, target size
├── widget/run.mjs               widget sizes and states: window size, overflow, hover/keyboard reveal
├── performance/
│   ├── run.mjs                  CPU + rendering cost per state, with budgets
│   └── cpu.ps1                  CPU sampler (app process + its WebView2 processes)
└── evidence/
    ├── contact-sheet.ps1  before-after.ps1  accent-share.ps1
    └── static-audit.mjs         token drift between two revisions; unused exports / CSS classes
```

Generated output goes to `.output/` (git-ignored). Only evidence you mean to keep is written elsewhere,
by passing `--out docs/design/<version>` explicitly.

## Prerequisites

- Windows 10/11 with the WebView2 runtime (present on Windows 11).
- Node.js 22.4 or newer (uses the built-in `fetch` and `WebSocket`). **No `npm install`** - there are no dependencies.
- Windows PowerShell 5.1 (built in) for `native/`, `performance/cpu.ps1` and `evidence/*.ps1`.
- The app is a Tauri v2 app (its windows expose `window.__TAURI_INTERNALS__`) and can be started with a
  dev command (`npm run tauri dev`), which needs the project's normal Rust and Node toolchains.
- `git`, only for `evidence/static-audit.mjs drift`.

Every command below is run **from the repository root** and uses the SUNDIAL config; add
`--config docs/design/qa-harness/config/<app>.config.json` (or set `QA_CONFIG`) for another app.

## Check the harness itself first (deterministic)

```bash
node docs/design/qa-harness/shared/selfcheck.mjs
```

No app or display needed. It validates each config and spec (no absolute machine paths, the default and minimum
window sizes are among the viewports, every surface a list names exists, every widget state in the matrix is defined),
compiles every code snippet injected into the page, parses every PowerShell script, and scans the folder for
machine-specific paths, credentials and stray output. A typo fails here in milliseconds, not ten minutes into a run.

## Launch an isolated test instance

The runners start sessions, change settings and delete presets, so they must never touch the real app's
data. The launcher runs the dev build with a **temporary app identifier** (`app.isolatedIdentifier` in the
config), which gives it its own app-data folder and its own WebView2 profile, and turns on remote debugging:

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File docs/design/qa-harness/native/instance.ps1 -Action start-dev -Config docs/design/qa-harness/config/sundial.config.json
```

It waits until the app's windows answer on the debugging port and prints one JSON line. Its log is at
`%TEMP%\qa-harness\<app>\dev.log`. Stop it with `-Action stop-dev`; `-Action inspect` shows which instance is
listening and which identifier it uses.

**Safety is enforced, not just documented.** Before a runner does anything it asks the OS which identifier the
instance on the debugging port really uses (`inspect` reads the WebView2 browser process's `--user-data-dir`). If
that is the app's real identifier, or it cannot be determined, the runner refuses and says so. `--allow-real-data`
overrides this: the app's state file is copied aside first and restored afterwards (its SHA-256 is compared), but you
are then driving live data, so only do it deliberately. The release binary always uses the real identifier, so
`instance.ps1 -Action start-release` refuses without `-AllowRealData`.

After a session, remove the isolated data. This names only the isolated identifier; it never touches the real one:

```bash
powershell -NoProfile -Command 'Remove-Item "$env:APPDATA\com.sundial.app.uidev","$env:LOCALAPPDATA\com.sundial.app.uidev" -Recurse -Force -ErrorAction SilentlyContinue'
```

## How the harness discovers the app's windows

1. WebView2 started with `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=<port>` serves every window of
   the app as a Chrome DevTools Protocol "page" target at `http://127.0.0.1:<port>/json/list`.
2. For each page the harness opens a CDP session and asks the page for its Tauri window label
   (`window.__TAURI_INTERNALS__.metadata.currentWindow.label`).
3. `windows.<role>.label` in the config maps a role (`main`, `widget`, ...) to a label. Windows can also be matched by
   `match: { urlIncludes, titleIncludes }`, and a window marked `optional` may be absent.
4. Specs address windows by role: `ctx.main`, `ctx.widget`, or `ctx.windows.<role>`.

The native side finds the same instance a different way: the WebView2 browser process whose command line contains the
port, then every WebView2 process sharing its user-data folder, then the app process that owns them. That is how
`inspect`, `win32.ps1` and the CPU sampler know which processes are "the app".

## The common options

Every runner accepts `--config <file>` (default `config/sundial.config.json`, or `QA_CONFIG`), `--out <dir>` (default
`.output/<runner>`), `--port <n>`, `--only a,b` (filter by name), `--wait <seconds>` (for windows to appear),
`--allow-real-data`, and `--fail-on-exceptions` (fail the run on uncaught page exceptions, which are always reported).
Each run writes `results.txt` (PASS/FAIL lines and a summary) next to its other output and exits 1 if anything failed.

## Capture baseline and after screenshots

`capture/capture.mjs` reaches every surface in the spec's `capture.main` at the window's default size, then every widget
state at every size (resting, hovered, on its secondary page, on a light backdrop). It writes `<name>.png` plus
`metrics.json` (scroll size, control census, pixel ratio).

```bash
node docs/design/qa-harness/capture/capture.mjs
node docs/design/qa-harness/capture/capture.mjs --out docs/design/v1.2.0
node docs/design/qa-harness/capture/capture.mjs --only 01-study-setup,widget-small-study
node docs/design/qa-harness/capture/capture.mjs --main-only
```

The first is a scratch run into `.output/capture`. The second is intentional evidence: commit it. `--main-only` or
`--widget-only` narrows a run.

A **baseline** is the same driver run against the build you are about to change, before you change it, with a spec whose
surface ids and capture names match the later run. Check out the old tag, start the isolated instance from that tree, and
capture into `docs/design/<old-version>-baseline`. Keep the names stable and `before-after.ps1` pairs the two sets one to one.

## Run functional QA

```bash
node docs/design/qa-harness/functional/run.mjs
node docs/design/qa-harness/functional/run.mjs --only study-plan,controls
node docs/design/qa-harness/functional/run.mjs --list
```

The spec supplies `functional.prepare(ctx)` (put the app in a fresh state) and `functional.sections[]` (ordered flows that
share app state, like a person working through the app; `--no-prepare` skips the setup). Each check uses real input
(`ctx.main.pointerClick`, `ctx.main.key`) and asserts on the app's own state through `ctx.main.invoke(<command>)`, so a
PASS means the click reached the engine, not that a label changed. The SUNDIAL spec has 64 checks in 9 sections.

`functional/lifecycle.mjs` is the native counterpart. For each quit path it triggers the action (a UI click, or a real
`WM_CLOSE` to the main window) and then asks the OS whether the app process and its WebView2 processes are gone, or, for
"keep running", whether the process survived with only the expected windows visible. It also writes a persisted session
into the stopped app's state file, cold-starts the app and asserts what the person sees. **It starts and stops the isolated
instance itself, and stops whatever instance is on the debugging port first.**

```bash
node docs/design/qa-harness/functional/lifecycle.mjs
node docs/design/qa-harness/functional/lifecycle.mjs --only settings-quit,restore-paused
node docs/design/qa-harness/functional/lifecycle.mjs --target release --allow-real-data
```

The last form drives the built release binary, which uses the real identifier: the state file is backed up first and
restored afterwards, but use it only when nothing else is using the app.

## Run responsive QA

```bash
node docs/design/qa-harness/responsive/run.mjs
node docs/design/qa-harness/responsive/run.mjs --only settings,timer-setup
node docs/design/qa-harness/responsive/run.mjs --no-shots
```

For every surface and viewport it checks horizontal overflow, controls or text leaving the window, text cut by its own
box (explicit `truncationSelectors` plus automatic detection of any element that clips its own text; set
`probes.autoClip` to `false` if an app clips text on purpose), and controls smaller than `minTargetPx`. Vertical scrolling
is recorded as information and fails only on surfaces that were not expected to scroll (`responsive.scrollsByDesign`)
outside 200% zoom. It also checks that the viewport list really contains the config's default and minimum window sizes.

## Run accessibility QA

```bash
node docs/design/qa-harness/accessibility/run.mjs
node docs/design/qa-harness/accessibility/run.mjs --only study-setup,preset-menu,reduced-motion,widget
```

Per surface: every interactive node in the browser's accessibility tree has a name, and walking Tab visits each control with
a visible >= 2px focus ring. Per spec: app-specific keyboard behaviour (menus, arrow-key groups), the readout's announced
form, reduced-motion states (no infinite animations, decorative motion stopped under `prefers-reduced-motion`), and that
widget controls are reachable by keyboard and not only revealed by hover.

## Run widget QA

```bash
node docs/design/qa-harness/widget/run.mjs
node docs/design/qa-harness/widget/run.mjs --only small,paused
node docs/design/qa-harness/widget/run.mjs --native
```

For every size and state in `spec.widget`: the window is exactly the size the config declares (`--native` also compares it
with the OS window rectangle), nothing overflows or is clipped at rest, on hover or on the secondary page, and controls are
hidden at rest and appear on hover. A screenshot of each variant is kept so a person can judge the look (`--no-shots` skips).

## Measure performance

```bash
node docs/design/qa-harness/performance/run.mjs
node docs/design/qa-harness/performance/run.mjs --seconds 30 --only "hourglass running"
```

Per state: CPU (percent of one core, summed over the app and its WebView2 processes, from `performance/cpu.ps1`) plus Chrome's
per-window counters (layouts, style recalculations, script and task time per second). A state with a `budget` fails when it
exceeds it. Budgets are generous on purpose: they exist to catch a step change (an animated SVG stroke once cost about 100%
of a core), not to benchmark. It is one sample per state on a machine that is doing other things, so numbers move between
runs; treat a failure as "look", then repeat with a longer `--seconds`.

## Prove the detectors detect

A green run only means something if the checks can go red. `shared/detector-check.mjs` injects a known defect into the live
app (a `<style>` or a node; the app's own code is never touched), confirms the matching detector reports it, removes it, and
confirms the page is clean again:

```bash
node docs/design/qa-harness/shared/detector-check.mjs
node docs/design/qa-harness/shared/detector-check.mjs --perf
```

It covers horizontal overflow, a control off the window edge, text clipped by its own box, an undersized target, an
infinite animation, a control with no accessible name, a hidden focus ring and clipped widget content. `--perf` (about
40 seconds) also injects the original SVG stroke animation and confirms the CPU budget trips (about 9% becomes about 95%).

## Generate evidence

```bash
powershell -NoProfile -File docs/design/qa-harness/evidence/before-after.ps1 -Before docs/design/v1.0.1-baseline -After docs/design/v1.1.0 -Names 01-study-setup,02-timer-setup -Out docs/design/v1.1.0/compare-1-setup.png
```

Side-by-side boards: the same surface from the old build and the new one (`-BeforeLabel` / `-AfterLabel` rename the captions).

```bash
powershell -NoProfile -File docs/design/qa-harness/evidence/contact-sheet.ps1 -Dir docs/design/qa-harness/.output/widget -Pattern "widget-small-*.png" -Out docs/design/qa-harness/.output/sheet.png
```

A labelled grid of any set of screenshots.

```bash
powershell -NoProfile -File docs/design/qa-harness/evidence/accent-share.ps1 -Before <dirA> -After <dirB> -Names 01-study-setup,07-study-paused
```

How much of each screenshot is the brand's accent hue (informational; `-HueMin`/`-HueMax` retarget it).

```bash
node docs/design/qa-harness/evidence/static-audit.mjs drift --before-rev <git rev> --before-dir src --after-dir src/styles
node docs/design/qa-harness/evidence/static-audit.mjs dead --src src --styles src/styles
```

Stylesheet token drift between a revision and now (raw colours outside the token file, distinct sizes/weights/radii,
off-rhythm spacing, shadows, gradients, infinite animations), and exports and CSS classes nothing uses. The counts are
questions to answer, not verdicts: a stylesheet that got larger while raw colours fell to zero is a trade-off to report
honestly, not a pass or a fail.

## What kind of check is each thing?

Be precise about what a green result proves.

| Kind                                  | What it can and cannot tell you                                                                                                                                                                                                                                                | Where it lives                                                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| **Deterministic automated**           | Pure logic and static analysis. No app, no display, repeatable byte for byte. Proves the contract, not the experience.                                                                                                                                                         | `shared/selfcheck.mjs`; `evidence/static-audit.mjs`; the app's own `npm run check` (unit tests, design-system gate)            |
| **WebView2 / CDP-driven**             | The DOM, computed styles, the accessibility tree, IPC calls, real input events dispatched into the page, page screenshots, Chrome's per-window counters. Proves what the page does and paints. Cannot see anything outside the page.                                           | `capture`, `functional/run`, `accessibility`, `responsive`, `widget` (page checks), `performance` (counters), `detector-check` |
| **Native Win32**                      | Facts from the OS: which processes exist, which top-level windows are visible and how big, `WM_CLOSE`, CPU time. Proves what Windows sees, independent of the page.                                                                                                            | `native/*.ps1`, `functional/lifecycle`, `widget --native`, `performance/cpu.ps1`                                               |
| **Emulated (viewport, DPI, media)**   | `Emulation.setDeviceMetricsOverride` changes the page's CSS viewport and pixel ratio; `setEmulatedMedia` sets `prefers-reduced-motion`. It does **not** resize the OS window or change Windows display scaling. Good for layout logic, not for how the OS composes the window. | `responsive` (window sizes, 125/150/200% scaling), `accessibility` (reduced motion), `capture`                                 |
| **Needs a person or a real OS state** | See "Known limitations". Do these by hand and record the result next to the evidence.                                                                                                                                                                                          | the checklist below                                                                                                            |

## Known limitations of CDP and native-window testing

- **Emulated DPI is not OS DPI.** A 150% pixel ratio exercises your CSS at that density; it does not change how Windows scales
  the frameless window, its shadow, or the WebView2 surface. Check real scaling by hand.
- **Emulated viewports are not window resizing.** Minimum-size enforcement by the OS, snapping, maximise and multi-monitor
  behaviour are not exercised.
- **CDP input is synthetic.** Events reach the page, so `:hover`, focus, clicks and keys behave like the real thing, but they
  bypass the OS: a real mouse drag that moves a frameless window, IME, and OS-level shortcuts are not tested. Drag is checked
  only as "the app's drag handler accepts a press on the surface and rejects one on a button".
- **The tray menu, toasts and audio are outside the page.** They are native shell UI and audio devices. Copy can be
  unit-tested and a sound's code path exercised; that a toast appeared or a sound was audible needs a person.
- **Screen readers are not run.** The accessibility check reads the browser's accessibility tree and paints, which is
  necessary but not the same as a screen-reader session.
- **Sleep/wake, clock changes and real elapsed time** are not exercised; reconcile logic belongs in unit tests.
- **Dev build, not release build.** The isolated instance runs the debug binary against the dev server: CPU numbers are
  pessimistic and startup differs. The release binary can be driven with `lifecycle.mjs --target release --allow-real-data`.
- **One CPU sample per state** on a shared machine is noisy; budgets are wide for that reason.
- **Windows only.** WebView2, `System.Drawing`, WMI and `user32` are Windows APIs.
- **Tauri only out of the box.** Window discovery reads Tauri's window label; other shells need a `windows.<role>.match`
  rule and their own way to call the app (the `invoke` helper is Tauri-specific).
- **Automatic clip detection is opinionated.** It flags any visible text element that clips its own overflow. An app that
  truncates on purpose should list those elements or turn `probes.autoClip` off.

### Still requires a person (record these next to the evidence)

- Tray menu (open, quit) with the real Windows shell.
- Real display scaling (100/125/150%) and a second monitor.
- Dragging a frameless window with a real mouse; snapping; always-on-top over other apps.
- A toast notification actually appearing; sounds actually audible.
- The widget's legibility over real wallpapers, not just the two flat backdrops.
- Sleep and wake, and restoring after a reboot.
- A screen reader and voice control.

## Start a new app (REDLINE, MUSE, ATLAS, LEXICON, ...)

1. Copy this folder to `docs/design/qa-harness/` in the app's repository (it has no dependencies).
2. Copy `config/template.config.json` to `config/<app>.config.json` and fill in the app identity, isolated identifier,
   process name, executables, window labels and sizes, viewports, and the selectors in `probes`. Nothing in a config may
   be an absolute path (the self-check enforces this); `${APPDATA}` style tokens are expanded.
3. Copy `config/template.spec.mjs` to `config/<app>.spec.mjs`. Start with `reset` and one surface; add surfaces, the capture
   list, functional sections and budgets as the app needs them. The spec is the only place that knows the app's screens,
   selectors and IPC commands.
4. `node docs/design/qa-harness/shared/selfcheck.mjs`, then start an isolated instance and run a runner with
   `--config docs/design/qa-harness/config/<app>.config.json` (or set `QA_CONFIG`).
5. Keep the runners generic. If something in a runner is app-specific, it belongs in the spec or the config.

### What a spec function can use

`ctx.main` / `ctx.widget` (and `ctx.windows.<role>`) are window handles:

| Helper                                                               | Does                                                                  |
| -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `click(text, selector?)`                                             | programmatic click on the control whose text or `aria-label` matches  |
| `pointerClick(selector)`                                             | real pointer move + press + release at the element's centre           |
| `key(name, {shift, ctrl, alt})`                                      | real key press: Tab, Enter, Escape, Space, Arrow keys, Home, End, ... |
| `hover(x, y)`                                                        | pointer move (drives `:hover`); `(-20, -20)` moves it away            |
| `setValue(selector, value)`                                          | sets an input the way frameworks notice                               |
| `text(selector)`, `$(selector, "e.expr")`, `count(selector)`         | read the page                                                         |
| `invoke(command, args)`                                              | call an IPC command; resolves to the parsed result                    |
| `eval(js)`, `probe(fn, arg)`                                         | run code in the page; `probe` takes a self-contained function         |
| `reload()`, `viewport(w, h, dpr)`, `media([...])`, `backdrop(color)` | page state and emulation                                              |
| `shot(file, {width, height, dpr, bg})`                               | PNG screenshot                                                        |
| `axTree()`, `performanceMetrics()`                                   | the accessibility tree; Chrome's counters                             |

Also on `ctx`: `ok(name, condition, detail)` (record a check), `enter(surfaceId)`, `section(title)`, `note(text)`, `sleep(ms)`,
`config`, `out` and `native` (the PowerShell bridge).

## Spec reference

`config/<app>.spec.mjs` default-exports an object with any of:

| Key             | Shape                                                                                                                       | Used by                            |
| --------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `reset`         | `async (ctx)` - app to idle, first screen                                                                                   | accessibility, performance         |
| `surfaces`      | `{ id: { window, enter(ctx) } }` - each independent of the others                                                           | capture, responsive, accessibility |
| `capture.main`  | `[{ name, surface, height?, wait? }]`                                                                                       | capture                            |
| `widget`        | `{ sizes, defaultSize, setSize, states, matrix, hoverPoint, openMore, clipSelectors, controls }`                            | capture, widget, accessibility     |
| `functional`    | `{ mutates, prepare(ctx), sections: [{ id, title, run(ctx) }] }`                                                            | functional                         |
| `accessibility` | `{ surfaces, keyboard, reducedMotion, describeExpect, widget }`                                                             | accessibility                      |
| `responsive`    | `{ surfaces: [id], scrollsByDesign: [id] }`                                                                                 | responsive                         |
| `performance`   | `{ states: [{ id, enter, budget }], defect? }`                                                                              | performance, detector-check        |
| `lifecycle`     | `{ settleMs, scenarios: [{ id, expect, trigger \| win32, prepare?, then? }], restore: { states, craft, observe, expect } }` | lifecycle                          |

## Hygiene

- Generated output lives in `.output/`, which is git-ignored. Screenshots, logs, PID files, backups and state live there or
  under `%TEMP%\qa-harness\<app>\`, never in the tree.
- Commit only evidence you intend to keep (`--out docs/design/<version>`), with a README saying how it was made.
- No credentials, tokens, machine-specific paths or downloaded installers belong here; `selfcheck.mjs` scans for them.
- Do not point a runner at a build you cannot afford to change: they start sessions, change settings and delete presets.

## Validation record

Last validated against SUNDIAL v1.1.0 (isolated dev instance), 2026-09-21:

| Runner                             | Result                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------ |
| `shared/selfcheck.mjs`             | 60 / 60                                                                                          |
| `capture/capture.mjs`              | 52 images; layout metrics and control census identical to the committed `docs/design/v1.1.0` set |
| `functional/run.mjs`               | 64 / 64                                                                                          |
| `accessibility/run.mjs`            | 22 / 22                                                                                          |
| `responsive/run.mjs`               | 67 / 67 (64 surface x viewport combinations)                                                     |
| `widget/run.mjs --native`          | 57 / 57                                                                                          |
| `performance/run.mjs`              | 5 / 5 within budget (idle 4%, running 7-12%, paused 1% of one core, dev build)                   |
| `shared/detector-check.mjs --perf` | 20 / 20 (every injected defect detected; CPU budget trips at about 95%)                          |
| `functional/lifecycle.mjs`         | 19 / 19 (four quit paths checked at the OS level, six restore states)                            |

Validating the generalisation found two harness bugs, fixed before this was committed: the widget clip probe counted
a glyph box taller than its line box as clipping (a false positive on every widget state), and `taskkill` reporting an
already-exited process aborted `stop-dev` under Windows PowerShell 5.1.

## Provenance

Extracted and generalised from the scripts used during the SUNDIAL v1.1.0 refactor. The committed evidence in
`docs/design/v1.1.0/` was produced by the earlier, app-specific versions of these scripts; this harness reproduces the
same surfaces and the same 64 functional checks. Where the numbers differ (the responsive matrix has one more surface,
`timer-setup-custom`, which is the state that once pushed the Start button below the fold, and the accessibility run starts
Timer setup from a preset instead of the remembered custom length), the difference is deliberate.
