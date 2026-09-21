import { formatDuration, formatTimer, spokenTime } from "../format.ts";
import { nextPhaseLabel, planTotalMs, studyBlockInfo } from "../session.ts";
import type { TimerState } from "../types";
import type { TimerVisualState } from "../visuals/visualTypes";

export type WidgetMode =
  "idle" | "study" | "break" | "timer" | "paused" | "awaiting" | "complete";

export interface WidgetView {
  mode: WidgetMode;
  visualState: TimerVisualState;
  /** Short state word: "Study", "Paused", "Focus complete", ... */
  label: string;
  /** Same word for the small widget's narrow slot: "Focus done", "Complete", ... */
  shortLabel: string;
  /** Position inside a study session: "2 of 3" (null outside study mode). */
  block: string | null;
  /** Large-widget subtitle: "Study 2 of 3", "Paused · Study 2 of 3", ... */
  line2: string;
  /** Session identity (preset name or label), if any. */
  title: string | null;
  /** "Next · 15m Break" */
  next: string | null;
  readout: string;
  progress: number;
  /** Time remaining for assistive tech (running/paused only). */
  spoken: string | null;
}

/**
 * One presentation for every widget size. Idle, Study, Break, Paused and
 * Complete (plus the waiting-for-you moment between phases) are all defined
 * here, so Small, Medium and Large can only differ in how much they show.
 */
export function widgetView(state: TimerState, remainingMs: number): WidgetView {
  const plan = state.plan;
  if (!plan) {
    return {
      mode: "idle",
      visualState: "idle",
      label: "Ready",
      shortLabel: "Ready",
      block: null,
      line2: "Ready",
      title: "SUNDIAL",
      next: null,
      readout: "00:00",
      progress: 0.75,
      spoken: null,
    };
  }

  const phases = plan.phases;
  const index = state.currentIndex;
  const isStudy = plan.mode === "study";
  const title = plan.label ?? plan.presetName;

  if (!state.isRunning) {
    const label = isStudy ? "Session complete" : "Time's up";
    return {
      mode: "complete",
      visualState: "complete",
      label,
      shortLabel: isStudy ? "Complete" : "Time's up",
      block: null,
      line2: label,
      title,
      next: null,
      readout: isStudy
        ? formatDuration(Math.round(planTotalMs(phases) / 60_000))
        : "00:00",
      progress: 0,
      spoken: null,
    };
  }

  if (state.awaitingAdvance) {
    const finished = phases[index - 1];
    const label =
      finished?.kind === "study" ? "Focus complete" : "Break complete";
    const next = nextPhaseLabel(phases, index - 1);
    return {
      mode: "awaiting",
      visualState: "complete",
      label,
      shortLabel: finished?.kind === "study" ? "Focus done" : "Break done",
      block: null,
      line2: label,
      title,
      next: next ? `Next · ${next}` : null,
      readout: formatTimer(finished?.durationMs ?? 0),
      progress: 0,
      spoken: null,
    };
  }

  const current = phases[index];
  const kind =
    current.kind === "study"
      ? "Study"
      : current.kind === "break"
        ? "Break"
        : "Timer";
  const info = studyBlockInfo(phases, index);
  const block =
    isStudy && info.total > 0 ? `${info.number} of ${info.total}` : null;
  const next = isStudy ? nextPhaseLabel(phases, index) : null;
  const paused = state.isPaused;
  const position = block ? `${kind} ${block}` : kind;

  return {
    mode: paused ? "paused" : current.kind,
    visualState: paused ? "paused" : current.kind,
    label: paused ? "Paused" : kind,
    shortLabel: paused ? "Paused" : kind,
    block,
    line2: paused ? `Paused · ${position}` : position,
    title,
    next: next ? `Next · ${next}` : null,
    readout: formatTimer(remainingMs),
    progress: state.durationMs > 0 ? remainingMs / state.durationMs : 0,
    spoken: `${spokenTime(remainingMs)} remaining`,
  };
}
