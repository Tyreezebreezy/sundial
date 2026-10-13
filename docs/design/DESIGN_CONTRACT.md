# SUNDIAL design contract (v1.2.0)

> SUNDIAL should show more time than interface.

This is the single source of truth for how SUNDIAL looks and behaves visually.
It describes the app as built in v1.2.0. Anything measurable is enforced by
`tests/design-system.test.mjs` (run by `npm test` / `npm run check`); the rest
is judged against the evidence in `docs/design/v1.2.0/`.

## 1. Product truth

SUNDIAL is a local Windows desktop timer for study sessions and general
countdowns, with an optional always-on-top desktop widget. It has no account,
cloud, analytics, streaks or tasks, and v1.2.0 adds none of them. v1.2.0 is a
visual and interaction-model modernization - composition, a signature
timeline component, a second presentation view, and a keyboard layer - not a
feature expansion. The timer engine (wall-clock authority, session-plan
calculation, persistence, recovery, sleep/wake reconciliation, sound,
notifications, quit paths) is unchanged, and **no backend command, state
field or persisted shape changed for v1.2.0** (section 12).

## 2. Design DNA

Sun, shadow, circular movement, the passage of time. Warm graphite neutrals,
one scarce gold. A calm instrument, not a dashboard: the time (a large numeral
and a visual) is the subject; controls and chrome recede until needed. v1.2.0
takes that further with an asymmetric composition on the setup surfaces - the
visual gets a stage of its own rather than sharing a single centered column -
and a to-scale session timeline (the Sunline) that is always visible rather
than hidden behind a disclosure.

Decoration-purpose gate: every visual element must do one of _show time_,
_show state_, _identify the current place_, or _make an action reachable_. Ornament that
does none of these is removed. There are no gradients on chrome, no glows on
controls, no nested cards and no decorative icons (the few icons that exist are
controls with accessible names). The one exception, by design, is the timer
visuals themselves (section 8): light and shadow *are* the interface there.

## 3. Color roles

Raw color values live **only** in `src/styles/tokens.css`. Everything else uses
`var(--color-*)`. WCAG ratios below are computed from the token values and
asserted by the test suite. Unchanged from v1.1.0 - no palette redesign.

| Role                     | Value     | Use                                                   | On canvas / surface-1 / surface-2 |
| ------------------------ | --------- | ----------------------------------------------------- | --------------------------------- |
| `--color-canvas`         | `#10100f` | window background                                     | -                                 |
| `--color-surface-1`      | `#171715` | raised interactive regions (controls, widget)         | -                                 |
| `--color-surface-2`      | `#1f1e1b` | hover / selected neutral surface                      | -                                 |
| `--color-text-primary`   | `#f1ede4` | timer numerals, headings, control text                | 16.29 / 15.36 / 14.27             |
| `--color-text-secondary` | `#a9a49a` | supporting text                                       | 7.67 / 7.24 / 6.72                |
| `--color-text-muted`     | `#8a857b` | labels, meta                                          | 5.19 / 4.89 / 4.54                |
| `--color-accent`         | `#d5a84c` | live time, selection, the one primary action          | 8.64 / 8.15 / 7.57                |
| `--color-accent-bright`  | `#e3b85d` | illumination, highlights                              | 10.23 / 9.64 / 8.95               |
| `--color-accent-deep`    | `#8b6a2d` | supporting detail in visuals; **never text**          | 3.81 on canvas                    |
| `--color-danger`         | `#c96c62` | destructive actions only                              | 5.26 / 4.96 / 4.61                |
| `--color-divider`        | `#292824` | hairlines between regions                             | decorative                        |
| `--color-border-control` | `#706c62` | boundary of an input control (non-text contrast >= 3) | 3.64 / 3.43 / 3.18                |
| `--color-focus`          | accent    | 2px focus ring, offset 2px                            | >= 3 on all surfaces              |

**Gold budget.** Gold means exactly one of: live time, the current selection, or
the one action to take on this surface. At most one gold-filled button per
surface. Gold is never used for body text, decoration, or "just to look
premium". Paused and break states desaturate gold rather than switching hue
(pause is not an error, so it is never red). The Sunline's current-position
marker is the one new gold-carrying element in v1.2.0, and it follows the same
rule: it marks live position, nothing else.

## 4. Typography roles

Segoe UI Variable (falling back to Segoe UI / system-ui). Weights are limited to
300 (timer numerals), 400 (body) and 600 (headings, controls). All numerals that
change use `font-variant-numeric: tabular-nums` so the readout never jitters.
Unchanged from v1.1.0.

| Role         | Token                        | Use                                            |
| ------------ | ----------------------------- | ---------------------------------------------- |
| Timer XL     | `--font-timer-xl`            | main readout, `clamp(3.25rem, 11vmin, 6.5rem)` |
| Widget timer | `--font-timer-widget*`       | 22 / 30 / 36 px by widget size                 |
| Display      | `--font-display`             | block identity, preset name                    |
| Heading      | `--font-heading`              | uppercase tracked eyebrow labels               |
| Body / Meta  | `--font-body`, `--font-meta` | copy, secondary lines                          |
| Control      | `--font-control(-lg)`        | button labels                                  |

No `font-size` or `font` outside a role token (test `UI-TYPE-003`). Focus
Display scales the timer numeral and hero visual up via two scoped custom
properties (`--font-size-timer-xl`, `--visual-hero`), not a second font role -
the same token, a bigger value, in one place.

## 5. Spacing, radius, elevation, motion, layout

- **Spacing** rhythm `4 8 12 16 24 32 48 64` (`--space-1..8`); no ad-hoc padding,
  margin or gap values (test `UI-SPACE-001`). Below 640px of window height a compact rhythm
  (52px header, `--space-1/2/3` gaps, the Instrument Stage visual and Sunline minute
  labels dropped first) keeps setup and active surfaces on one screen without scrolling.
- **Radius** roles: `sm 8`, `md 10`, `lg 12`, `float 16` (widget), `full` (circles).
- **Elevation** has three levels: 0 canvas; 1 raised region (`surface-1` + a hairline);
  2 transient (the preset menu). A shadow is used only at level 2; the widget window is
  exactly its own size, so the widget uses a hairline border instead of a shadow.
  Focus Display is level 0 (canvas) at a larger scale, not a new elevated layer.
- **Motion** durations `150 / 210 / 300 ms` with two easings. Motion happens when
  something changes (hover, selection, state change, panel enter, the Sunline's
  position marker moving, Focus Display's exit affordance revealing); nothing loops.
  `prefers-reduced-motion: reduce` removes every animation and transition, and
  the hourglass stream (below) is not rendered. Test `UI-MOTION-004/005` asserts
  the stylesheet contains no `infinite` animation.
- **Layout** content column `46rem` (~736px) centered, including the two-column
  composition below. Controls are 44px (`--control-height`), 32px for compact
  secondary controls; the window is 900 x 760, minimum 640 x 560. Two new size
  roles: `--visual-instrument: clamp(140px, 30vmin, 256px)` (the Instrument
  Stage) and `--visual-choice-compact: 48px` (the Visual picker inside the
  Session Composer, smaller than its `--visual-choice: 64px` use elsewhere so
  the composer column stays compact).

## 6. Components

| Component                   | Rule                                                                                                                                                                                                                                                                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button                      | `primary` (gold fill, one per surface) / `secondary` (surface + border) / `tertiary` (text only) / `danger` (text, red on confirm). Hover changes surface or border, never size.                                                                                                                                      |
| Destructive action          | Two-step inline confirm (`ConfirmButton`): first press arms it ("Confirm reset"), second commits; it disarms on blur or after a timeout. No modal dialogs.                                                                                                                                                            |
| Segmented / choice controls | Native radios in a `radiogroup` (one tab stop, arrow keys). Selected = border + brighter text + bottom marker (not color alone).                                                                                                                                                                                      |
| Switch                      | Native checkbox with `role="switch"`.                                                                                                                                                                                                                                                                                 |
| Preset selector             | Progressive disclosure: a trigger showing the current rhythm opens a grouped list - the two primary rhythms (Deep Study 45/15, Classic 25/5), the other built-ins under a divider, then saved presets (each with a delete control) - and "+ Custom preset" opens the form. The row's radio input is the click target. |
| Duration entry              | Study: labeled "Total session", 1h / 2h / 3h / Custom. Timer: five-column two-row grid of 5-120 min plus Custom.                                                                                                                                                                                                     |
| **Sunline**                  | **New, signature.** The session plan to scale: gold bars for study, thin muted bars for break, proportional to actual duration. Three contexts share one component (`Sunline`): the setup preview (labeled, always visible once a plan exists - no "View plan" disclosure), a compact unlabeled strip under the active controls with a leading position marker, and the same compact strip in the Large widget. Each segment carries its length in a native `title` (hover) and the list has one accessible name (`aria-label="Session plan"`); nothing about it is the only way to learn the plan - the eyebrow and readout already say the position in words. |
| **Focus Display**            | **New.** A second, bigger, full-bleed presentation of the exact same `ActiveSession` - not a second timer, not a second window. Entered with `F` or a quiet icon button next to Skip/Reset; exits on `Esc` or a corner button that stays at opacity 0 until hover or keyboard focus reveals it (same pattern as the widget's controls).                                                                      |
| Validation                  | Inline, next to the field, in text (never toast or modal).                                                                                                                                                                                                                                                            |
| Focus                       | 2px gold ring, 2px offset, on every keyboard-focusable control.                                                                                                                                                                                                                                                       |

## 7. Surfaces

**Shell.** Wordmark, STUDY | TIMER navigation (hidden during a session, when the
session owns the window), settings toggle. The native Windows title bar above
it is unchanged (see section 9a) - full title-bar customization was evaluated
and rejected.

**Study setup** (primary-action navigation), restructured for v1.2.0 into an
**Instrument Stage** (the visual, given its own column, `clamp(140px, 30vmin, 256px)`)
beside a **Session Composer** (preset selector, "Total session", Visual picker -
now always visible, not hidden behind Options - a one-line plan summary, and
one contextual CTA: "Start 2h Classic" / "Choose a duration"). Below both, full
width, the **Sunline** is always visible once a plan exists. "Options" now holds
only auto-advance and an optional label. "Repeat last" appears only when the
last session differs from what is selected. Below 800px window width the two
columns collapse to the single centered column every other surface uses -
"two columns" is a normal-desktop-size composition, not a requirement.

**Timer setup.** The same Instrument Stage + Composer language: preview visual
and length readout on the stage, the 5-120 / Custom grid and visual picker in
the composer, one CTA. Simpler than Study by design - no Sunline (a single
countdown has no plan to show).

**Active session** (immersive). Eyebrow (`STUDY · 2 OF 4`), block identity, the
hero visual, a single 300-weight readout (`role="timer"`, spoken label), next
phase, Pause/Resume + "+5" as the primary row, "Skip phase", **Focus Display**
and "Reset" (destructive, two-step) as quiet secondary actions - all three
stay directly visible rather than behind an overflow menu, so nothing is
mouse-only. For a study session, a compact unlabeled **Sunline** with a live
position marker sits below the controls. Awaiting-advance and finished states
use the same layout with the copy "Focus complete", "Break complete", "Session
complete", "Time's up".

**Focus Display** (new). Entered from an active session; a full-bleed, fixed
overlay (`position: fixed; inset: 0`) showing the identical `ActiveSession`
component at a larger scale. Not OS fullscreen, not a second Tauri window - no
new state, nothing that can drift out of sync with the main window or widget,
because it is not a second anything.

**Settings** (single scrolling console, five sections): Appearance, Study, Widget,
Audio, App (keyboard shortcuts reference, close behaviour, Quit SUNDIAL).

**Widget** (progress at a glance) - see section 9.

## 8. Timer visuals

`Disk`, `Hourglass` and `Sundial` are pure functions of `TimerVisualProps`
(`remainingMs`, `durationMs`, `progress`, `state`, `size`, `reducedMotion`). They
never own timer authority and never read a clock. One state grammar sets
illumination for all three through CSS custom properties (`--tv-lit-*`,
`--tv-fill`, `--tv-glow`):

| State             | Look                                 |
| ------------------ | ------------------------------------- |
| `idle`            | quiet, reduced illumination          |
| `study` / `timer` | warm, the brightest intentional gold |
| `break`           | calmer, less illumination            |
| `paused`          | muted, low contrast (not red)        |
| `complete`        | one 300 ms brighten, then settle     |

- **Sundial** is the signature: an asymmetric tapered shadow from a fixed two-tone gnomon,
  now grounded on a small base ellipse (v1.2.0), a warm light on the opposite side, a gold
  rim arc for the time that remains, and hour lines at uneven spacing. There is no solar
  calculation - the geometry is fixed; only the remaining time moves the shadow.
- **Hourglass** sand levels follow the geometry (surface height proportional to the
  square root of the remaining fraction). The bulbs use a rounded-shoulder silhouette
  (v1.2.0: a quadratic curve from vertical at the rim to horizontal at the neck) rather
  than a straight-sided funnel. While running (and only then, and not under reduced
  motion) a thin stream falls through the neck, advancing one of four steps per 200 ms
  timer tick rather than through an animation loop - this constraint was re-verified for
  v1.2.0 (section 72 of the handoff): no continuous high-frequency loop was reintroduced.
  Measured across both windows in a debug build: an animated SVG stroke used about 100% of
  one CPU core; the tick-driven stream measured 7.8-12% across study states in the v1.2.0
  performance pass (section "Performance" in the release report), still well inside the
  30% budget.
- **Disk** is the plainest: a gold sector for what remains, hour ticks on the large tier.
  v1.2.0 adds a soft, wide, 22%-opacity duplicate of the boundary line under the crisp one
  (`.tv-edge-glow`) - light receding at the terminator, restrained, not a glowing ring.
- Small sizes drop ticks and fine detail; pixel size always comes from CSS.

## 9. Widget

Three sizes (small 272x56, medium 232x172, large 272x244 - unchanged window
sizes in v1.2.0), opaque `surface-1` with a hairline border (legible on light
and dark wallpapers). The whole surface except its buttons is the drag handle.
Time, state and the visual are always visible; controls (Pause/Resume, "+5" or
Skip, and a "..." page for Skip, Reset, Open SUNDIAL, Quit) fade in on hover or
keyboard focus. Modes: Idle, Study, Break, Paused, Awaiting ("Focus done" /
"Break done"), Complete. The small widget uses one short label per mode
("Ready", "Study", "Break", "Timer", "Paused", "Focus done", "Break done",
"Complete", "Time's up") and never truncates it.

**Large widget (v1.2.0):** below the readout, a compact unlabeled Sunline with
a live position marker appears for a running, paused or on-break study
session - the same simplified strip the main window's active view uses, not a
compressed copy of the main window. It fit inside the existing 244px window
height without a resize.

## 9a. Windows integration (evaluated for v1.2.0)

**Title bar:** full custom title-bar integration (removing OS decorations and
reimplementing drag/resize/snap/system-menu) was evaluated and rejected - the
native dark-themed title bar (`"theme": "Dark"` in `tauri.conf.json`, set in
v1.1.0) already reads as part of the same graphite surface, and the native
behaviors it would put at risk (Snap Layouts, the system menu, DPI-correct
resize borders) are exactly what section 51 of the handoff said not to trade
away for visual polish.

**Mica:** evaluated and rejected. SUNDIAL's content is deliberately full-bleed
flat graphite with zero decorative chrome (section 2) - there is no region of
the window where a Mica backdrop would ever be visible without introducing a
transparent strip, and doing that would mean reworking the contrast-ratio
methodology the whole accessibility story (section 3, `UI-COLOR-002`) rests on,
for an effect that would be invisible in practice. Rejected for cost
disproportionate to payoff, not for a technical failure.

**Acrylic:** rejected outright per the handoff's own guidance (transient-surface
use only, documented resize/drag performance problems) - never prototyped.

## 10. Copy

Sentence case, plain, no exclamation marks, no motivational text. Unchanged
from v1.1.0.

| Event                | Notification title | Body                                                                                         |
| --------------------- | -------------------- | ----------------------------------------------------------------------------------------------- |
| Study block complete | Study complete     | "Your 15-minute break is ready." / "Your next block is ready." / "Your session is complete." |
| Break complete       | Break complete     | "Time to return to your study session." / "Your session is complete."                        |
| Timer complete       | Timer complete     | -                                                                                            |

On launch the app says "Session restored." for a running, paused or awaiting
session. If the app opens onto a finished session it says "Your session finished"
or "Your timer finished" - it does not claim to know when it finished, because the
engine reconciles elapsed time before the UI first asks.

## 11. Accessibility

- Every interactive element has an accessible name (audit: 0 unnamed on all surfaces,
  including Focus Display's exit button and the Sunline's single list name).
- The readout is `role="timer"` with a spoken label ("44 minutes 59 seconds
  remaining"), `aria-live="polite"`; the decorative visuals and the Sunline's bars are
  `aria-hidden` where the same information already exists as text nearby.
- Text meets 4.5:1 and control/focus boundaries 3:1 on every surface (tests).
- Every control is keyboard reachable in a logical order with a visible 2px focus ring;
  the preset list opens on Enter, arrows change the selection, Escape closes and returns focus.
- Default hit area 44x44; compact rhythm (window below 640px tall) and the volume
  slider use >= 32px. Nothing is below 24x24 (WCAG 2.2 AA).
- No information is carried by color alone (selection has a border and marker; state has words).
- `prefers-reduced-motion` and 200% zoom are handled (see `docs/design/v1.2.0/`).

**Keyboard shortcut layer (v1.2.0).** One `document`-level listener
(`useShortcuts`), not scattered per-screen handlers, suppressed whenever a text
field, select, range or other form control has focus, or a modifier key is
held:

| Key       | Action                                                      |
| --------- | ------------------------------------------------------------ |
| `Space`   | Pause / Resume - only while a session is running, not awaiting |
| `+` / `=` | Add 5 minutes - same guard                                   |
| `S`       | Skip phase - study sessions only                              |
| `F`       | Enter Focus Display - any time a session exists, any of its states |
| `Esc`     | Close whichever overlay is open (Settings or Focus Display)  |

Reachable from Settings → App, listed next to the close-behaviour control, not
printed permanently on every surface (section 58 of the handoff).

## 12. Backend changes made for v1.2.0

**None.** Every v1.2.0 surface, interaction and visual refinement is
presentational: Focus Display renders the existing `ActiveSession` at a larger
scale from state the main window already subscribes to; the Sunline derives
its segments from the plan the engine already returns; the keyboard layer
calls the same Tauri commands the existing buttons already called. No new
`#[tauri::command]`, no new field on `Settings`/`Preset`/`TimerState`, no new
persisted shape, and therefore no new migration test - `src-tauri/src/*.rs`
is unchanged from v1.1.0 except for the version string.

The four backend changes made for v1.1.0 (preset defaults, next-phase
notification copy, widget window sizes, dark window theme) still stand and are
documented in the v1.1.0 evidence.

## 13. Changing the design

1. New color/space/radius/type/motion value -> add a role to `tokens.css` first.
2. New surface -> pick its archetype in section 7, list its one primary action, and add
   evidence under `docs/design/`.
3. New keyboard shortcut -> add it to `useShortcuts`, the table in section 11, and the
   Settings → App list - all three, not just one.
4. Run `npm run check`; the design-system tests must stay green.
5. Verify in the running app (native window, not only the browser dev server), using
   the QA harness at `docs/design/qa-harness/` - capture, functional, accessibility,
   responsive, widget, performance and lifecycle all exercise the live app, which is
   where the v1.1.0 pilot found its real defects (and where this one found two: a
   default-size layout overflow in the new composition, and a test assertion that
   didn't match the real eyebrow text).
