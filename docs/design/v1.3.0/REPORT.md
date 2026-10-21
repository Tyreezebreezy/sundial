# SUNDIAL v1.3.0 refinement

## Result

The existing time instrument has been refined around graphite, gold light,
shadow and Sunline. The Rust timer, planning rules, stored identifiers,
audio and notifications retain their existing authority and behavior.

## Design and implementation

- **Instrument Stage and Session Composer:** balanced asymmetric columns,
  intentional duration and three-visual rows, total time beneath the instrument,
  and a proportional session plan. Narrow windows stack cleanly.
- **Active Study:** time and the next phase lead; Sunline sits above a quieter
  control shelf. Study, Break, Paused, waiting and completion remain distinct.
- **Focus Display:** larger responsive digits, a bounded instrument, quiet exit,
  keyboard access to every action, and one 300ms opacity transition on entry.
  Phase changes do not replay that entrance. Reduced motion disables it.
- **Sundial:** closer rim, clearer gnomon, tapered shadow and restrained light.
  This is a symbolic timer instrument, not an astronomical simulation.
- **Sunline:** zero flex basis preserves duration ratios regardless of labels;
  the marker follows exact phase progress. Current, upcoming and completed
  segments differ structurally and have accessible phase labels.
- **Widgets:** preserved native sizes, shrinkable visual area and reserved footer,
  long-name truncation with full title, and a Focus Display route to the same
  authoritative session. Keyboard focus keeps secondary controls available.
- **Keyboard:** Space activates a focused button once; held shortcuts cancel
  browser defaults without repeating timer commands. Typing remains exempt.
- **Icons:** original shared dial/gnomon/shadow master for application, window,
  installer and uninstaller; a transparent simplified tray derivative; all 13
  in-app controls on one 20-unit, 1.5-stroke family. Open and Focus are distinct.
  ICO frames cover 16/24/32/48/64/256px. Source vectors, generator, inputs and
  generation hashes are preserved. No runtime dependency was added.

## Discovery and Forge use

Starting SUNDIAL was clean main at `0d1df9a` / v1.2.0. Work began on
`refine/v1.3-ui-icons`. During execution, concurrent owner commits checkpointed
the work (`0d63ab1`) and relocated Cargo outputs to E: (`ef8866e`). The subsequent `e7ccd5c`
keeps the machine-specific Cargo config local and checkpoints the Rust/Tauri
version and icon README. All three owner commits were preserved. No history rewrite was performed.

Forge baseline: main v2.8.0, `297970b`. Its three pre-existing dirty files were
preserved. Applied Modernization Toolkit, Visual Workbench, MAYA frontend,
UI Standard, UX Intelligence, Icon Standard and Motion Standard. The pinned
Emil Kowalski provider revision was `e8a175de22ae1e49370fc144c1f3bb9aeedf988d`.
Prototype, animation, resilience and independent review workflows were actually
used. No image generation or new component library was needed.

Native temporary prototypes compared centered Instrument and split Horizon
compositions across setup, active and Focus surfaces (six captures). Instrument
kept familiar spatial relationships and clearer time hierarchy. Alternatives
for rail, widget and Sundial treatment were recorded as hypotheses, not claimed
as owner preference. No prototype picker ships.

All five current Forge UI, quality, design-system, direction and UX-intelligence
validators passed. These validate the Forge packs, not SUNDIAL itself. SUNDIAL's
own deterministic design-contract tests and rendered QA provide product evidence.

## Verification

| Check                                                       | Result                                                  | Evidence directory under docs/design/v1.3.0                |
| ----------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------- |
| Frontend formatting, TypeScript, tests, production frontend | PASS; 38 tests                                          | build command output                                       |
| Rust fmt/check/clippy/tests                                 | PASS; 22 tests                                          | build command output                                       |
| Harness selfcheck                                           | 60/60                                                   | command output                                             |
| Native functional regression                                | 75/75                                                   | functional-recheck                                         |
| Keyboard, names, focus, reduced motion                      | 24/24                                                   | accessibility-final                                        |
| Responsive matrix                                           | 67/67                                                   | responsive                                                 |
| Native widget matrix                                        | 57/57                                                   | widget-recheck                                             |
| Stress/resilience                                           | 19/19                                                   | resilience-recheck                                         |
| Quit and persisted-session restoration                      | 19/19                                                   | lifecycle-final                                            |
| Performance budgets                                         | 10/10                                                   | performance-final                                          |
| Defect injection checks                                     | 20/20                                                   | detectors-final                                            |
| Final screenshots                                           | 53/53                                                   | final                                                      |
| Icon generation selfchecks                                  | 11/11                                                   | icons/verification.json                                    |
| Icon test mutation                                          | original passes, corrupt type fails, restored passes    | icons/detector-mutation.txt                                |
| Independent source review                                   | PASS, previous findings closed                          | INDEPENDENT-REVIEW.md                                      |
| Production executable                                       | 75 functional + 19 resilience checks passed             | production-functional, production-resilience               |
| Exact extracted installer payload                           | 75 functional + 19 resilience checks passed             | installer-payload-functional, installer-payload-resilience |
| App and installer PE icon frames                            | all six canonical frames match; mutated reference fails | icons/pe-resources.txt                                     |

The resilience exercise covered exact 2h37m planning, rapid +5 and pause/resume,
Space on a focused action, Unicode/long labels, a 1440-phase 24h plan,
Focus at 640/1920/2560/3840 widths, narrow 200% emulation, widget Focus delivery
and reduced motion. A deliberately restored auto flex basis broke the Sunline
ratio check; removing it restored 3:1. A hot SVG stroke animation raised measured
CPU from 10.15% to 112.24% of one core, tripping the 30% budget.

Earlier failing evidence is retained and superseded explicitly: Focus Tab access
was fixed; native widget selection now excludes the minimized main window;
resilience sizing now updates both settings and the native window; functional
widget expectations now account for retained keyboard focus and the Focus action.
No product assertion was removed to make the final runs pass.

## Performance

Single 8-second samples, sum of app and its WebView2 processes, percentage of
one core on this shared 16-logical-core Windows machine:

| State                         |                    CPU |
| ----------------------------- | ---------------------: |
| Idle                          |                  0.19% |
| Disk                          |                  8.39% |
| Sundial                       |                 10.34% |
| Hourglass                     |                 12.48% |
| Paused hourglass              |                     0% |
| Break                         |                 13.26% |
| Small / medium / large widget | 12.67 / 12.10 / 13.07% |
| Focus Display                 |                 10.72% |

The earlier 5-second v1.2 samples were 0 / 6.23 / 7.16 / 14.34 / 1.56% for
idle/Disk/Sundial/Hourglass/paused. Different short samples on a shared machine
do not establish a precise regression percentage or an all-day battery claim.
All final budget checks passed; the interface adds no continuous decorative loop.

## Acceptance assessment

The time-first hierarchy, restrained palette, symbolic dial and Sunline make the
composition identifiable without depending on the product name. Common operations
remain immediate, keyboard-accessible and backed by the same engine. The native
layout and behavior checks support the design decision; subjective owner visual
acceptance is not represented as a measured test result.

## Release and limitations

Artifact: **SUNDIAL_1.3.0_x64-setup.exe**, 2,093,177 bytes.

SHA-256: `cfca526839c1dd7bfda9e8b9916a8f1bc08f00cf4863b0329e7a943a3513e9e4`.

Exact extracted executable SHA-256: `dd58d772b7b57e5a0f0c22c26f2b88470d672fdbad75e001a4da4b549db3af7e`.
The NSIS payload differs from the final standalone executable only in Tauri's
three-byte UNK-to-NSS bundle-type marker. It was executed and tested separately,
not inferred from the standalone test. Both PE files embed all canonical icon
frames. Corrupting a reference frame makes the comparison fail. Installer
extraction passed with 7-Zip. Installer execution/install/uninstall was not
performed. The actual installation workflow is outside this evidence.

Production and extracted-payload tests used an independent pre-launch snapshot.
The harness reported no automatic backup, so that independent snapshot remained
authoritative; after stopping each tested process it was restored and checked
byte-for-byte (SHA-256 `d60c2c910d1879d95b6e34b8787977254c8b3ef3ef92cd3531f8c8bca6b1e551`).

Windows Computer Use inspection timed out waiting for app access. No titlebar,
taskbar, tray-menu or shell icon-cache visual verification is claimed. The icon
consistency evidence comprises original vector review, native in-app captures,
compile-time tray embedding, configuration and PE resource comparison.

The repository was confirmed private through its authenticated API and returned
404 anonymously. Publication and re-download verification are recorded in the
delivered report after the release operation.

Scaling evidence is WebView2 viewport/DPR emulation, not physical Windows DPI
testing. Real sleep/wake was not induced; restoration used crafted timestamps.
No screen-reader listening session, audible listening test, long-duration power
study or axe scan was performed (axe was not installed). No new security scan was
claimed. Physical tray interaction, shell cache behavior, and install/uninstall remain
untested. These limitations are not presented as passing tests.
