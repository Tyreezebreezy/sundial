// Bridge to the PowerShell scripts that do the Windows-native work: launching
// and stopping instances, inspecting processes and windows, closing windows the
// way the OS does (WM_CLOSE), and sampling CPU. Each script prints exactly one
// JSON document on stdout; diagnostics go to stderr.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { HARNESS_DIR } from "./config.mjs";

export const SCRIPTS = {
  instance: path.join(HARNESS_DIR, "native", "instance.ps1"),
  win32: path.join(HARNESS_DIR, "native", "win32.ps1"),
  cpu: path.join(HARNESS_DIR, "performance", "cpu.ps1"),
};

/** Run a harness PowerShell script; returns { data, stderr, code }. */
export function runScript(script, params = {}, { timeoutMs = 240_000 } = {}) {
  const args = [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    script,
  ];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === false) continue;
    args.push(`-${key}`);
    if (value !== true) args.push(String(value));
  }
  const r = spawnSync("powershell", args, {
    encoding: "utf8",
    timeout: timeoutMs,
  });
  const lines = (r.stdout ?? "").trim().split(/\r?\n/).filter(Boolean);
  let data = null;
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      data = JSON.parse(lines[i]);
      break;
    } catch {
      /* not the JSON line */
    }
  }
  return {
    data,
    stdout: r.stdout,
    stderr: (r.stderr ?? "").trim(),
    code: r.status,
  };
}

/** Convenience wrappers keyed to a loaded config. */
export function native(config) {
  const base = { Config: config.configPath, Port: config.port };
  return {
    instance: (action, extra = {}) =>
      runScript(SCRIPTS.instance, { Action: action, ...base, ...extra }),
    win32: (action, extra = {}) =>
      runScript(SCRIPTS.win32, { Action: action, ...base, ...extra }),
    cpu: (seconds) =>
      runScript(
        SCRIPTS.cpu,
        { ...base, Seconds: seconds },
        { timeoutMs: (seconds + 60) * 1000 },
      ),
  };
}
