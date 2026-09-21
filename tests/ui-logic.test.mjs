import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDuration,
  formatMinutesLabel,
  formatTimer,
  spokenTime,
} from "../src/format.ts";
import {
  buildStudySchedule,
  customDurationError,
  lastConfig,
  nextPhaseLabel,
  planTotalMs,
  splitMinutes,
  studyBlockInfo,
} from "../src/session.ts";

test("formatTimer is fixed-width mm:ss and switches to h:mm:ss at one hour", () => {
  assert.equal(formatTimer(0), "00:00");
  assert.equal(formatTimer(5 * 60_000), "05:00");
  assert.equal(formatTimer(45 * 60_000), "45:00");
  assert.equal(formatTimer(32 * 60_000 + 18_000), "32:18");
  assert.equal(formatTimer(3_600_000), "1:00:00");
  assert.equal(formatTimer(7_200_000 - 1000), "1:59:59");
});

test("formatTimer rounds partial seconds up so a running timer never shows 00:00 early", () => {
  assert.equal(formatTimer(1), "00:01");
  assert.equal(formatTimer(999), "00:01");
  assert.equal(formatTimer(-500), "00:00");
});

test("formatDuration reads as 45m / 2h / 2h 30m", () => {
  assert.equal(formatDuration(45), "45m");
  assert.equal(formatDuration(120), "2h");
  assert.equal(formatDuration(150), "2h 30m");
  assert.equal(formatDuration(0), "0m");
});

test("formatMinutesLabel reads naturally on a button", () => {
  assert.equal(formatMinutesLabel(30), "30 min");
  assert.equal(formatMinutesLabel(60), "1h");
  assert.equal(formatMinutesLabel(90), "1h 30m");
});

test("spokenTime is screen-reader friendly", () => {
  assert.equal(spokenTime(32 * 60_000 + 18_000), "32 minutes 18 seconds");
  assert.equal(spokenTime(60_000), "1 minute");
  assert.equal(spokenTime(3_661_000), "1 hour 1 minute 1 second");
  assert.equal(spokenTime(0), "0 seconds");
});

test("study block numbering counts the block just finished during a break", () => {
  const phases = buildStudySchedule(150, 45, 15); // S45 B15 S45 B15 S30
  assert.deepEqual(studyBlockInfo(phases, 0), { number: 1, total: 3 });
  assert.deepEqual(studyBlockInfo(phases, 1), { number: 1, total: 3 });
  assert.deepEqual(studyBlockInfo(phases, 2), { number: 2, total: 3 });
  assert.deepEqual(studyBlockInfo(phases, 4), { number: 3, total: 3 });
});

test("next-phase copy matches the spec strings", () => {
  const phases = buildStudySchedule(150, 45, 15);
  assert.equal(nextPhaseLabel(phases, 0), "15m Break");
  assert.equal(nextPhaseLabel(phases, 1), "Study 2 of 3");
  assert.equal(nextPhaseLabel(phases, 3), "Study 3 of 3");
  assert.equal(nextPhaseLabel(phases, 4), null);
});

test("planTotalMs sums every phase", () => {
  assert.equal(planTotalMs(buildStudySchedule(150, 45, 15)), 150 * 60_000);
});

test("custom duration validation gives inline copy, not silent clamping", () => {
  assert.equal(customDurationError(2, 30), null);
  assert.equal(customDurationError(0, 0), "Enter a duration greater than 0.");
  assert.equal(
    customDurationError(Number.NaN, 0),
    "Enter a duration greater than 0.",
  );
  assert.equal(customDurationError(24, 0), null);
  assert.equal(customDurationError(24, 1), "Enter 24 hours or less.");
});

test("splitMinutes round-trips an arbitrary total", () => {
  assert.deepEqual(splitMinutes(150), { hours: 2, minutes: 30 });
  assert.deepEqual(splitMinutes(45), { hours: 0, minutes: 45 });
});

test("lastConfig resolves only when the remembered preset still exists", () => {
  const presets = [
    {
      id: "deep-study",
      name: "Deep Study",
      studyMinutes: 45,
      breakMinutes: 15,
    },
  ];
  assert.equal(
    lastConfig(null, 120, presets),
    null,
    "brand-new user has no last config",
  );
  assert.equal(lastConfig("deep-study", null, presets), null);
  assert.equal(lastConfig("deleted-preset", 120, presets), null);
  assert.deepEqual(lastConfig("deep-study", 120, presets), {
    preset: presets[0],
    totalMinutes: 120,
  });
});
