# SUNDIAL v1.3 refinement

Mode: DESIGN → PRODUCTION. Risk: STANDARD. Authority: REFINE, from the owner's
attached mission and explicit UI/icon request. Release is conditional on all
required gates. No timer-authority, persistence, planning, audio, notification,
security, architecture, or technical-identifier migration is authorized by this
visual pass.

## Starting state

- SUNDIAL: clean `main`, `0d1df9a`, also `v1.2.0` and local `origin/main`.
- Remote: `[private-git-server]`.
- Working branch: `refine/v1.3-ui-icons`.
- Forge: `the-forge`, `main`, `297970b`, tagged v2.8.0.
- Forge has pre-existing owner changes in `registry/tools.json`,
  `schemas/tool-registry.schema.json`, and `scripts/validate-packs.ps1`.
  These remain untouched. Stable pack/provider source, rather than claims about
  those modified tooling files, supplies this pass's methodology.
- Baseline frontend: check PASS (37 tests, TypeScript, formatting, Vite build).
- Baseline Rust: fmt, check, Clippy with warnings denied, 22 tests PASS.
- Harness self-check: 60/60 PASS.
- Fresh baseline screenshots: `baseline/`. Capture was interrupted when the
  isolated native endpoint exited; partial capture is not a complete QA pass.

## Product truth and experience

Two jobs: prepare a structured Study session, or start a general Timer. During
either, read remaining time and act immediately. Time remains Rust-owned. The
visual hierarchy is time → phase/context → controls, with graphite, cream,
scarce gold, illumination, and shadow. No dashboard or suite features.

| Surface / depth               | User need and experience                                            | Archetype / interaction                                       | Alternatives                                                                                        | Selected refinement and reason                                                                  |
| ----------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Study setup / deep            | Prepare an instrument; comprehend rhythm, total, visual, then start | Instrument + compact composer; existing native radios/menu    | Instrument: asymmetric pair and intentional choice rows. Horizon: stage above a horizontal composer | Instrument preserves approved identity and avoids widening the task into a new navigation model |
| Active Study / deep           | Read exact time instantly and retain session position               | Centered time instrument; semantic primary/secondary controls | Centered instrument/readout with context band. Wide visual/readout split                            | Centered scales down more coherently and preserves familiar spatial relationships               |
| Sundial / deep                | See time through light, gnomon, and shadow                          | Symbolic planar instrument; timer progress drives geometry    | Grounded plate with tapered shadow. Minimal orbital arc                                             | Grounded plate retains signature meaning; orbital treatment risks becoming a clock              |
| Focus Display / moderate      | Read across a room with low visual demand                           | Bounded full-window presentation of authoritative session     | Readout-led. Instrument-led enlargement                                                             | Readout-led distinguishes this mode through purpose, not decoration                             |
| Large widget / moderate       | Glance at session state and reach actions                           | Adaptive instrument with guaranteed footer                    | Vertical instrument with shrinkable visual row. Horizontal miniature main window                    | Vertical retains supported dimensions and repairs clipped controls                              |
| Sunline / moderate            | Understand phase proportions and position                           | Separate proportional bars, structural Study/Break difference | Separate bars. Continuous notched rail                                                              | Separate bars preserve established grammar; zero flex basis fixes proportions                   |
| Settings and controls / light | Find controls without distracting from time                         | Existing compact groups and semantic buttons                  | Retain infrastructure, remove incidental inconsistencies                                            | Reuse existing controls; no new component library                                               |

These alternatives are design hypotheses (E1); the independent source/screenshot
audit is E2. Native rendering and automated interactions supply E3 execution
evidence. They are not observed owner preference or production-behavior evidence.

## Intent trace

1. Accidental 2+1 visual-picker wrap and 2×2 duration choices → a legible sequence →
   compare Instrument/Horizon → choose compact Instrument → intentional grids,
   direct duration selection, total tied to stage → native captures → critique.
2. Controls competing with the active time/context → calm active instrument →
   compare centered/split → centered → Sunline before control shelf, quiet
   secondary actions with full keyboard access → native captures and focus tests.
3. Label-sized Sunline segments and a rounded percent marker → truthful duration
   ratios → zero basis and exact transform position → measured ratios at odd
   durations and dense plans.
4. Large-widget footer clipping → guaranteed action access → allocate real footer
   rows and shrink the instrument → exercise every native widget state.
5. Sundial's large illumination and floating arc → grounded light/shadow object →
   restrained light, closer rim, tapered shadow and clearer gnomon → native visual
   comparison, no astronomical simulation.
6. Disconnected desktop and control glyph meanings → coherent original set →
   preserve semantic control names, one geometry/stroke family, shared desktop
   master with optical small-size treatment → asset and packaged-resource checks.

## Forge usage and constraints

Applied current Modernization Toolkit, Forge UI Standard, MAYA frontend intents,
Visual Workbench, UX Intelligence, Icon Standard, Motion Standard, and the pinned
Emil Kowalski prototype/animate/improve-animations/review-animations/break-ui
provider workflows (`e8a175de22ae1e49370fc144c1f3bb9aeedf988d`).

The current checkout has no separately named Creative Discovery instruction file.
Discovery above follows the current Product Truth/Experience/Design Intent stack,
not an invented legacy command. The SUNDIAL-like Forge fixture explicitly says
it is not production SUNDIAL and was not adopted as product authority.

Registry reuse: existing project Segmented, Switch, PresetSelector, ConfirmButton,
Icon and TimerVisual take precedence over imported infrastructure. Existing
native radios supply arrow-key behavior. No runtime dependency additions.
The owner explicitly requests a custom SUNDIAL control family; this is the
product-specific exception to the generic registry family recommendation.

Prototypes are temporary CSS overlays in the isolated native test profile,
sharing real controls and state. Screenshots preserve comparison evidence.
No experimental variant is shipped. Independent audit and asset generation use
separate scopes; a single writer integrates production source.

Motion purpose: state indication and continuity. Reuse existing 150/210/300 ms
tokens, CSS opacity/transform, no new animation runtime. Remove layout-driven
Sunline interpolation and completion brightness filtering. Timer progress remains
authoritative, never a second clock. Reduced motion disables nonessential motion.

The user's mission grants routine refinement decisions and automatic resilience
fixes; provider workflows' generic stop-for-selection/fix instructions do not
override that authorization. No fundamentally different product identity chosen.

## Validation boundary

Native WebView2 captures, input, IPC, OS process/window checks, and emulated
viewport/DPI results must be distinguished. Physical DPI, physical dragging,
screen-reader operation, audible output, and native shell tray interaction are
not established by CDP. Release must not be claimed while required gates remain
REVIEW or FAIL.
