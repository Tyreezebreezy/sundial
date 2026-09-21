# SUNDIAL design contract (v1.1.0)

> SUNDIAL should show more time than interface.

This is the single source of truth for how SUNDIAL looks and behaves visually.
It describes the app as built in v1.1.0. Anything measurable is enforced by
`tests/design-system.test.mjs` (run by `npm test` / `npm run check`); the rest
is judged against the evidence in `docs/design/v1.1.0/`.

## 1. Product truth

SUNDIAL is a local Windows desktop timer for study sessions and general
countdowns, with an optional always-on-top desktop widget. It has no account,
cloud, analytics, streaks or tasks, and v1.1.0 adds none of them. The redesign
changed how the app looks and is organised; the timer engine (wall-clock
authority, session-plan calculation, persistence, recovery, sleep/wake
reconciliation, sound, notifications, quit paths) is unchanged apart from the
documented extensions in section 12.

## 2. Design DNA

Sun, shadow, circular movement, the passage of time. Warm graphite neutrals,
one scarce gold. A calm instrument, not a dashboard: the time (a large numeral
and a visual) is the subject; controls and chrome recede until needed.

Decoration-purpose gate: every visual element must do one of _show time_,
_show state_, _identify the current place_, or _make an action reachable_. Ornament that
does none of these is removed. There are no gradients on chrome, no glows on
controls, no nested cards and no decorative icons (the few icons that exist are
controls with accessible names).

## 3. Color roles

Raw color values live **only** in `src/styles/tokens.css`. Everything else uses
`var(--color-*)`. WCAG ratios below are computed from the token values and
asserted by the test suite.

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
(pause is not an error, so it is never red).

## 4. Typography roles

Segoe UI Variable (falling back to Segoe UI / system-ui). Weights are limited to
300 (timer numerals), 400 (body) and 600 (headings, controls). All numerals that
change use `font-variant-numeric: tabular-nums` so the readout never jitters.

| Role         | Token                        | Use                                            |
| ------------ | ---------------------------- | ---------------------------------------------- |
| Timer XL     | `--font-timer-xl`            | main readout, `clamp(3.25rem, 11vmin, 6.5rem)` |
| Widget timer | `--font-timer-widget*`       | 22 / 30 / 36 px by widget size                 |
| Display      | `--font-display`             | block identity, preset name                    |
| Heading      | `--font-heading`             | uppercase tracked eyebrow labels               |
| Body / Meta  | `--font-body`, `--font-meta` | copy, secondary lines                          |
| Control      | `--font-control(-lg)`        | button labels                                  |

No `font-size` or `font` outside a role token (test `UI-TYPE-003`).

## 5. Spacing, radius, elevation, motion, layout

- **Spacing** rhythm `4 8 12 16 24 32 48 64` (`--space-1..8`); no ad-hoc padding,
  margin or gap values (test `UI-SPACE-001`). Below 640px of window height a compact rhythm
  (52px header, `--space-2/3` gaps) keeps setup surfaces on one screen.
- **Radius** roles: `sm 8`, `md 10`, `lg 12`, `float 16` (widget), `full` (circles).
- **Elevation** has three levels: 0 canvas; 1 raised region (`surface-1` + a hairline);
  2 transient (the preset menu). A shadow is used only at level 2; the widget window is
  exactly its own size, so the widget uses a hairline border instead of a shadow.
- **Motion** durations `150 / 210 / 300 ms` with two easings. Motion happens when
  something changes (hover, selection, state change, panel enter); nothing loops.
  `prefers-reduced-motion: reduce` removes every animation and transition, and
  the hourglass stream (below) is not rendered. Test `UI-MOTION-004/005` asserts
  the stylesheet contains no `infinite` animation.
- **Layout** content column `46rem` (~736px) centered; controls are 44px
  (`--control-height`), 32px for compact secondary controls; the window is
  900 x 760, minimum 640 x 560; the hero visual scales with the viewport
  (`clamp(152px, 31vmin, 352px)`).

## 6. Components

| Component                   | Rule                                                                                                                                                                                                                                                                                                                  |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button                      | `primary` (gold fill, one per surface) / `secondary` (surface + border) / `tertiary` (text only) / `danger` (text, red on confirm). Hover changes surface or border, never size.                                                                                                                                      |
| Destructive action          | Two-step inline confirm (`ConfirmButton`): first press arms it ("Confirm reset"), second commits; it disarms on blur or after a timeout. No modal dialogs.                                                                                                                                                            |
| Segmented / choice controls | Native radios in a `radiogroup` (one tab stop, arrow keys). Selected = border + brighter text + bottom marker (not color alone).                                                                                                                                                                                      |
| Switch                      | Native checkbox with `role="switch"`.                                                                                                                                                                                                                                                                                 |
| Preset selector             | Progressive disclosure: a trigger showing the current rhythm opens a grouped list - the two primary rhythms (Deep Study 45/15, Classic 25/5), the other built-ins under a divider, then saved presets (each with a delete control) - and "+ Custom preset" opens the form. The row's radio input is the click target. |
| Duration entry              | Study: 1h / 2h / 3h / Custom with the explicit label "Total session". Timer: five-column two-row grid of 5-120 min plus Custom.                                                                                                                                                                                       |
| Validation                  | Inline, next to the field, in text (never toast or modal).                                                                                                                                                                                                                                                            |
| Focus                       | 2px gold ring, 2px offset, on every keyboard-focusable control.                                                                                                                                                                                                                                                       |

## 7. Surfaces

**Shell.** Wordmark, STUDY | TIMER navigation (hidden during a session, when the
session owns the window), settings toggle.

**Study setup** (primary-action navigation). Preset selector, "How long are you
studying?" (1h / 2h / 3h / Custom; no default for a brand-new user), a one-line
plan summary with "View plan" (a proportional timeline of the blocks), an
"Options" disclosure (visual, auto-advance, label), and one contextual CTA
("Start 2h Classic" / "Choose a duration"). "Repeat last" appears only when the
last session differs from what is selected.

**Timer setup.** Preview visual, the length readout, the 5-120 / Custom grid,
visual picker, one CTA. Simpler than Study by design.

**Active session** (immersive). Eyebrow (`STUDY · 2 OF 4`), block identity, the
hero visual, a single 300-weight readout (`role="timer"`, spoken label), next
phase, Pause/Resume + "+5" as the primary row, "Skip phase" and "Reset" as quiet
secondary actions. Awaiting-advance and finished states use the same layout with
the copy "Focus complete", "Break complete", "Session complete", "Time's up".

**Settings** (single scrolling console, five sections): Appearance, Study, Widget, Audio,
App (close behaviour, Quit SUNDIAL).

**Widget** (progress at a glance) - see section 9.

## 8. Timer visuals

`Disk`, `Hourglass` and `Sundial` are pure functions of `TimerVisualProps`
(`remainingMs`, `durationMs`, `progress`, `state`, `size`, `reducedMotion`). They
never own timer authority and never read a clock. One state grammar sets
illumination for all three through CSS custom properties (`--tv-lit-*`,
`--tv-fill`, `--tv-glow`):

| State             | Look                                 |
| ----------------- | ------------------------------------ |
| `idle`            | quiet, reduced illumination          |
| `study` / `timer` | warm, the brightest intentional gold |
| `break`           | calmer, less illumination            |
| `paused`          | muted, low contrast (not red)        |
| `complete`        | one 300 ms brighten, then settle     |

- **Sundial** is the signature: an asymmetric tapered shadow from a fixed two-tone gnomon,
  a warm light on the opposite side, a gold rim arc for the time that remains, and
  hour lines at uneven spacing. There is no solar calculation - the geometry is
  fixed; only the remaining time moves the shadow.
- **Hourglass** sand levels follow the geometry (surface height proportional to the
  square root of the remaining fraction). While running (and only then, and not
  under reduced motion) a thin stream falls through the neck. It advances one of
  four steps per 200 ms timer tick rather than through an animation loop. Measured
  across both windows in a debug build: an animated SVG stroke used about 100% of one CPU
  core, a compositor-transform loop about 60%, and the tick-driven stream 7.8%
  (disk 4.2%, sundial 5.2%, paused 0.3%).
- **Disk** is the plainest: a gold sector for what remains, hour ticks on the large tier.
- Small sizes drop ticks and fine detail; pixel size always comes from CSS.

## 9. Widget

Three sizes (small 272x56, medium 232x172, large 272x244), opaque `surface-1`
with a hairline border (legible on light and dark wallpapers). The whole surface
except its buttons is the drag handle. Time, state and the visual are always
visible; controls (Pause/Resume, "+5" or Skip, and a "..." page for Skip, Reset,
Open SUNDIAL, Quit) fade in on hover or keyboard focus. Modes: Idle, Study, Break,
Paused, Awaiting ("Focus done" / "Break done"), Complete. The small widget uses one
short label per mode ("Ready", "Study", "Break", "Timer", "Paused", "Focus done",
"Break done", "Complete", "Time's up") and never truncates it.

## 10. Copy

Sentence case, plain, no exclamation marks, no motivational text.

| Event                | Notification title | Body                                                                                         |
| -------------------- | ------------------ | -------------------------------------------------------------------------------------------- |
| Study block complete | Study complete     | "Your 15-minute break is ready." / "Your next block is ready." / "Your session is complete." |
| Break complete       | Break complete     | "Time to return to your study session." / "Your session is complete."                        |
| Timer complete       | Timer complete     | -                                                                                            |

On launch the app says "Session restored." for a running, paused or awaiting
session. If the app opens onto a finished session it says "Your session finished"
or "Your timer finished" - it does not claim to know when it finished, because the
engine reconciles elapsed time before the UI first asks.

## 11. Accessibility

- Every interactive element has an accessible name (audit: 0 unnamed on all surfaces).
- The readout is `role="timer"` with a spoken label ("44 minutes 59 seconds
  remaining"), `aria-live="polite"`; the decorative visuals are `aria-hidden`.
- Text meets 4.5:1 and control/focus boundaries 3:1 on every surface (tests).
- Every control is keyboard reachable in a logical order with a visible 2px focus ring;
  the preset list opens on Enter, arrows change the selection, Escape closes and returns focus.
- Default hit area 44x44; compact rhythm (window below 640px tall) and the volume
  slider use >= 32px. Nothing is below 24x24 (WCAG 2.2 AA).
- No information is carried by color alone (selection has a border and marker; state has words).
- `prefers-reduced-motion` and 200% zoom are handled (see `docs/design/v1.1.0/README.md`).

## 12. Backend changes made for v1.1.0

Four, all additive or presentational (Rust tests cover the first two):

1. `Preset` gained optional `default_total_minutes`, `auto_advance`, `visual`
   (`#[serde(default)]`; presets saved by 1.0.x load unchanged) and `save_preset`
   accepts them, so a saved preset can carry its own defaults.
2. Study-complete and break-complete notifications now say what comes next (copy in section 10);
   the wording is produced by `completion_copy` / `following_phases` in `commands.rs`.
3. Widget window sizes changed for the redesigned layout (`widget.rs::size_for`).
4. The main window declares `"theme": "Dark"` so native window chrome matches the app.

The timer engine, persistence, recovery, audio backend and quit logic were not modified.

## 13. Changing the design

1. New color/space/radius/type/motion value -> add a role to `tokens.css` first.
2. New surface -> pick its archetype in section 7, list its one primary action, and add
   evidence under `docs/design/`.
3. Run `npm run check`; the design-system tests must stay green.
4. Verify in the running app (native window, not only the browser dev server).
