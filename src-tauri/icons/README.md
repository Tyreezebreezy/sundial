# SUNDIAL icon sources

Original SUNDIAL artwork: a gold dial, graphite ground, gnomon and shadow.
`sundial.svg` is the app/window/installer master. `tray.svg` is its simpler
transparent derivative. All 13 controls in `src/ui/Icon.tsx` share a 20-unit
grid and round 1.5-unit stroke, with distinct Open and Focus symbols.

The installed Tauri CLI generates desktop formats:

`node node_modules/@tauri-apps/cli/tauri.js icon src-tauri/icons/sundial.svg --output <temporary-directory>`

Copy only the desktop files already named in this folder. Do not introduce the
mobile assets produced by that command. The existing tray PNG was rasterized
from tray.svg at 32px using Sharp, as an authoring tool only. No runtime
dependency was added. Tauri also supports `icon tray.svg --png 32 --output <temporary-directory>`
for future regeneration; compare its rasterization before replacing the PNG.

The Windows ICO includes 16, 24, 32, 48, 64 and 256px frames. NSIS installer and
uninstaller explicitly use icon.ico; Tauri's default window icon uses the same
bundle. The Rust tray builder embeds tray.png. Verification and contact sheet:
`docs/design/v1.3.0/icons/`. Tests validate frame bounds, dimensions and wiring.
