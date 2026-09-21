import assert from "node:assert/strict";
import test from "node:test";
import { buildStudySchedule } from "../src/session.ts";
import { widgetView } from "../src/widget/widgetView.ts";

const idleState = {
  plan: null,
  currentIndex: 0,
  startedAt: null,
  endsAt: null,
  durationMs: 0,
  pausedAt: null,
  pausedRemainingMs: null,
  isPaused: false,
  isRunning: false,
  awaitingAdvance: false,
};

function studyPlan(total = 150) {
  return {
    mode: "study",
    label: null,
    visual: "disk",
    autoAdvance: false,
    presetName: "Deep Study",
    phases: buildStudySchedule(total, 45, 15),
  };
}
const running = (over = {}) => ({
  ...idleState,
  plan: studyPlan(),
  isRunning: true,
  durationMs: 45 * 60_000,
  ...over,
});

test("Idle: no session reads as ready, quiet, and offers no time pressure", () => {
  const v = widgetView(idleState, 0);
  assert.equal(v.mode, "idle");
  assert.equal(v.visualState, "idle");
  assert.equal(v.label, "Ready");
  assert.equal(v.readout, "00:00");
  assert.equal(v.spoken, null);
});

test("Study: warm state, position and next phase are stated in text", () => {
  const v = widgetView(running(), 32 * 60_000 + 18_000);
  assert.equal(v.mode, "study");
  assert.equal(v.visualState, "study");
  assert.equal(v.label, "Study");
  assert.equal(v.block, "1 of 3");
  assert.equal(v.line2, "Study 1 of 3");
  assert.equal(v.next, "Next · 15m Break");
  assert.equal(v.readout, "32:18");
  assert.equal(v.title, "Deep Study");
  assert.equal(v.spoken, "32 minutes 18 seconds remaining");
});

test("Break: calmer state, next phase is the following study block", () => {
  const v = widgetView(
    running({ currentIndex: 1, durationMs: 15 * 60_000 }),
    12 * 60_000,
  );
  assert.equal(v.mode, "break");
  assert.equal(v.visualState, "break");
  assert.equal(v.line2, "Break 1 of 3");
  assert.equal(v.next, "Next · Study 2 of 3");
});

test("Paused: stated as text, keeps position, never an error state", () => {
  const v = widgetView(
    running({ isPaused: true, pausedRemainingMs: 10 * 60_000 }),
    10 * 60_000,
  );
  assert.equal(v.mode, "paused");
  assert.equal(v.visualState, "paused");
  assert.equal(v.label, "Paused");
  assert.equal(v.line2, "Paused · Study 1 of 3");
});

test("Waiting between phases: says what finished and what is next", () => {
  const v = widgetView(
    running({
      currentIndex: 1,
      awaitingAdvance: true,
      durationMs: 15 * 60_000,
    }),
    0,
  );
  assert.equal(v.mode, "awaiting");
  assert.equal(v.visualState, "complete");
  assert.equal(v.label, "Focus complete");
  assert.equal(v.next, "Next · 15m Break");
  assert.equal(v.readout, "45:00");
});

test("Complete (study): reports total session time, does not evaluate the user", () => {
  const v = widgetView(
    { ...idleState, plan: studyPlan(150), isRunning: false },
    0,
  );
  assert.equal(v.mode, "complete");
  assert.equal(v.visualState, "complete");
  assert.equal(v.label, "Session complete");
  assert.equal(v.readout, "2h 30m");
});

test("Complete (timer): Time's up at 00:00", () => {
  const timerPlan = {
    mode: "timer",
    label: null,
    visual: "disk",
    autoAdvance: true,
    presetName: null,
    phases: [{ kind: "timer", durationMs: 30 * 60_000 }],
  };
  const v = widgetView({ ...idleState, plan: timerPlan, isRunning: false }, 0);
  assert.equal(v.label, "Time's up");
  assert.equal(v.readout, "00:00");
});

test("General timer: no study metadata leaks into the widget", () => {
  const timerPlan = {
    mode: "timer",
    label: null,
    visual: "disk",
    autoAdvance: true,
    presetName: null,
    phases: [{ kind: "timer", durationMs: 30 * 60_000 }],
  };
  const v = widgetView(
    { ...idleState, plan: timerPlan, isRunning: true, durationMs: 30 * 60_000 },
    30 * 60_000,
  );
  assert.equal(v.mode, "timer");
  assert.equal(v.block, null);
  assert.equal(v.next, null);
  assert.equal(v.line2, "Timer");
});
