// PASS / FAIL recording shared by every runner.
import fs from "node:fs";
import path from "node:path";

export class Recorder {
  constructor({ quiet = false } = {}) {
    this.quiet = quiet;
    this.lines = [];
    this.pass = 0;
    this.fail = 0;
  }

  /** Record one check. Returns the condition so callers can branch on it. */
  ok(name, cond, detail = "") {
    const passed = Boolean(cond);
    passed ? this.pass++ : this.fail++;
    const line = `${passed ? "PASS" : "FAIL"}  ${name}${passed ? "" : detail ? `  <-- ${detail}` : ""}`;
    this.lines.push(line);
    if (!this.quiet) console.log(line);
    return passed;
  }

  /** Informational line that is not a check (measurements, notes). */
  note(text) {
    this.lines.push(`      ${text}`);
    if (!this.quiet) console.log(`      ${text}`);
  }

  section(title) {
    this.lines.push("", `## ${title}`);
    if (!this.quiet) console.log(`\n## ${title}`);
  }

  get summary() {
    return `${this.pass} passed, ${this.fail} failed`;
  }

  get exitCode() {
    return this.fail ? 1 : 0;
  }

  write(dir, file = "results.txt", extra = "") {
    fs.mkdirSync(dir, { recursive: true });
    const target = path.join(dir, file);
    fs.writeFileSync(
      target,
      this.lines.join("\n") + `\n\n${this.summary}\n${extra}`,
    );
    return target;
  }
}
