import assert from "node:assert/strict";
import test from "node:test";
import { buildStudySchedule, summarizeSchedule } from "../src/session.ts";

function kinds(phases) {
  return phases.map((p) => p.kind);
}

function minutes(phases) {
  return phases.map((p) => p.durationMs / 60_000);
}

test("Deep Study 45/15 across 2 hours", () => {
  const schedule = buildStudySchedule(120, 45, 15);
  assert.deepEqual(kinds(schedule), ["study", "break", "study", "break"]);
  assert.deepEqual(minutes(schedule), [45, 15, 45, 15]);
});

test("Deep Study 45/15 across 2h30 shortens the final study block, no trailing break", () => {
  const schedule = buildStudySchedule(150, 45, 15);
  assert.deepEqual(kinds(schedule), [
    "study",
    "break",
    "study",
    "break",
    "study",
  ]);
  assert.deepEqual(minutes(schedule), [45, 15, 45, 15, 30]);
});

test("Classic Pomodoro 25/5 across multiple durations", () => {
  assert.deepEqual(minutes(buildStudySchedule(25, 25, 5)), [25]);
  assert.deepEqual(minutes(buildStudySchedule(30, 25, 5)), [25, 5]);
  assert.deepEqual(minutes(buildStudySchedule(60, 25, 5)), [25, 5, 25, 5]);
  assert.deepEqual(minutes(buildStudySchedule(65, 25, 5)), [25, 5, 25, 5, 5]);
});

test("never exceeds the selected total duration", () => {
  for (const total of [10, 25, 47, 63, 90, 121, 150, 181]) {
    const schedule = buildStudySchedule(total, 45, 15);
    const sumMinutes = schedule.reduce(
      (acc, p) => acc + p.durationMs / 60_000,
      0,
    );
    assert.ok(
      sumMinutes <= total,
      `schedule for ${total}m totals ${sumMinutes}m`,
    );
  }
});

test("never appends a break that would have to be truncated to fit", () => {
  // 47m leaves 2m after the first 45m study block - too short for a real
  // 15m break, so the schedule should just stop rather than tack on a
  // useless 2-minute break fragment.
  assert.deepEqual(minutes(buildStudySchedule(47, 45, 15)), [45]);
});

test("a break that fits at full length is kept even as the last phase", () => {
  // 120m divides evenly into 45/15/45/15 - the trailing break is a full,
  // untruncated break, not a useless fragment, so it stays (matches the
  // Deep Study 2h example above).
  const schedule = buildStudySchedule(120, 45, 15);
  const last = schedule[schedule.length - 1];
  assert.equal(last.kind, "break");
  assert.equal(last.durationMs, 15 * 60_000);
});

test("allows a shortened final study block shorter than the configured study duration", () => {
  const schedule = buildStudySchedule(100, 45, 15);
  // 45 study, 15 break, 40 study(shortened) -> 100 total
  assert.deepEqual(minutes(schedule), [45, 15, 40]);
});

test("zero or negative inputs produce no schedule", () => {
  assert.deepEqual(buildStudySchedule(0, 45, 15), []);
  assert.deepEqual(buildStudySchedule(45, 0, 15), []);
});

test("summarizeSchedule reports total/study/break minutes and study block count", () => {
  const schedule = buildStudySchedule(150, 45, 15);
  assert.deepEqual(summarizeSchedule(schedule), {
    totalMinutes: 150,
    studyMinutes: 120,
    breakMinutes: 30,
    studyBlocks: 3,
  });
});
