# SUNDIAL

Visual Study Timer. Windows desktop app (Tauri 2 + React + TypeScript).

Study mode (structured focus/break sessions) and a General Timer, three
selectable visualizations (Disk, Hourglass, Sundial), and a synchronized
desktop widget. Local-only: no accounts, no cloud services.

## Develop

```powershell
npm install
npm run check
cargo check --locked --manifest-path src-tauri\Cargo.toml
npm run tauri dev
```

Build the installer with `npm run tauri build`.
