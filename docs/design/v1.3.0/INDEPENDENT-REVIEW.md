# SUNDIAL v1.3 final source review

Date: 2026-10-21. Reviewer: design_audit. Scope: current uncommitted UI, motion, keyboard, widget Focus route, and icon integration against base HEAD `0d1df9a75ca83a0cb72c19dbd4c8296ce6758091`. Production files were read-only. This is an independent review of the UI implementation; the reviewer authored the staged icon artwork, so the icon portion is integration verification, not an independent aesthetic review.

## Result

**PASS for the bounded source review: no remaining actionable source findings identified.** This is not release approval, owner visual acceptance, or an independent native-runtime pass.

The three earlier findings are resolved:

- `src/useShortcuts.ts`: recognized shortcuts cancel browser defaults before ignoring repeats; focused buttons retain native Space activation. Form inputs and modifiers remain exempt.
- `src/session/ActiveSession.tsx`: all three session-state sections no longer carry `surface-in`, avoiding full-view entrance replay on phase skip and ordinary active-view remounts.
- `src/styles/app.css:1279`: the 300ms opacity-only Focus entry now belongs to the persistent `.focus-display` wrapper. Keyed phase-section remounts cannot restart it. This explicit owner-approved 240–320ms entry overrides the provider's generic no-keyboard-animation guideline; no further exception was inferred.

## Source evidence

- Motion purpose is confined to state/entry feedback. Focus and completion use opacity; Sunline uses a direct element transform rather than animated `left`. No additional timer, animation loop, or motion dependency was introduced. The existing global `prefers-reduced-motion` rule in `src/styles/base.css:380` disables the new entry animation, and hourglass streaming still respects the reduced-motion prop. Source review does not establish actual frame budgets.
- `src/session/FocusDisplay.tsx` focuses the persistent container once with `preventScroll`, leaving Space available to the session shortcut instead of implicitly activating Exit. Exit remains a native named button.
- `src/tauri.ts` opens the existing main window, then targets its Focus event. `src/MainApp.tsx` registers once and cleans up even if asynchronous listener registration resolves after disposal. Existing `core:event:default` permissions cover the route; no new backend command, capability, persisted state, or engine authority was added.
- `src/widget/Widget.tsx` preserves the More page on pointer leave while keyboard focus remains inside. The existing blur handler closes it when focus leaves. Grid changes reserve the proper footer with/without Sunline and allow the visual track to shrink.
- Sunline fixes its segment basis at zero, so labels no longer affect duration proportions; position translation uses the full-width segment wrapper. Accessible phase labels/current-step semantics remain independent of decorative marker geometry.
- All 13 in-app icon names remain available on the same 20px/1.5px custom SVG family. Open and Expand now have distinct launch/window versus four-corner silhouettes. Existing accessible names remain at button call sites.
- `src-tauri/src/lib.rs:48` embeds `icons/tray.png` at compile time with the existing Tauri macro. `tauri.conf.json` explicitly points both NSIS installer and uninstaller to `icons/icon.ico`. Existing bundled filenames remain intact.
- Independent SHA-256 comparison found all **17 integrated binary assets** identical to the staged generation manifest. The generated ICO directory contains 16, 24, 32, 48, 64, and 256px entries. Earlier direct inspection covered application icons at 16/24/32/48/256px and the contact sheet; this does not prove Windows shell/cache display.

## Runtime evidence attribution

The implementation worker performed native QA, not this reviewer. Its final resilience result is **19/19** at `docs/design/v1.3.0/resilience-recheck/results.txt`; the earlier `resilience/results.txt` result of 18/19 is retained but superseded. The worker reports the earlier failure came from the runner changing native widget size without updating settings; the rerun used `spec.widget.setSize`. Widget recheck is **57/57** at `widget-recheck/results.txt`. The worker also reports final functional **75/75**, accessibility **24/24**, and captures **53/53**. These counts must retain their original runner provenance in the final evidence bundle.

## Reproducibility and limitations

The SVG masters are now in `src-tauri/icons`, but the reproducible generation script currently lives in the chat workspace at `work/icons/generate-icons.mjs`. Preserve that script with its expected `sundial-master.svg`, `sundial-tray.svg`, and `Icon.tsx` inputs in the evidence/source bundle before workspace cleanup; see `work/icons/README.recommended.md`. It uses existing Tauri CLI 2.11.4 and Sharp 0.35.5 as authoring tools, not application dependencies.

No production files changed, no harness rerun, no independent packaged install/uninstall or native tray/DPI testing, and no motion trace recorded during this final review. No security-scan or release claim is made.
