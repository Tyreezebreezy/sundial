import { Disk } from "./visuals/Disk";
import { Hourglass } from "./visuals/Hourglass";
import { Sundial } from "./visuals/Sundial";
import { api } from "./tauri";
import { formatClock } from "./format";
import type { TimerState, VisualKind } from "./types";

function Visual({
  visual,
  progress,
  remainingMs,
}: {
  visual: VisualKind;
  progress: number;
  remainingMs: number;
}) {
  if (visual === "hourglass")
    return (
      <Hourglass progress={progress} remainingMs={remainingMs} size={200} />
    );
  if (visual === "sundial")
    return <Sundial progress={progress} remainingMs={remainingMs} size={240} />;
  return <Disk progress={progress} remainingMs={remainingMs} size={240} />;
}

export function ActiveSession({
  state,
  remainingMs,
}: {
  state: TimerState;
  remainingMs: number;
}) {
  const plan = state.plan;
  if (!plan) return null;

  const currentPhase = plan.phases[state.currentIndex];
  const nextPhase = plan.phases[state.currentIndex + 1];
  const progress = state.durationMs > 0 ? remainingMs / state.durationMs : 0;

  const studyBlockCount = plan.phases.filter((p) => p.kind === "study").length;
  const currentStudyBlockNumber = plan.phases
    .slice(0, state.currentIndex + 1)
    .filter((p) => p.kind === "study").length;

  const phaseHeading = state.awaitingAdvance
    ? currentPhase.kind === "break"
      ? "STUDY COMPLETE"
      : "BREAK COMPLETE"
    : currentPhase.kind === "study"
      ? "STUDY"
      : currentPhase.kind === "break"
        ? "BREAK"
        : "TIMER";

  return (
    <div className={`active-session phase-${currentPhase.kind}`}>
      {plan.label && <p className="session-label">{plan.label}</p>}
      <p className="phase-heading">{phaseHeading}</p>
      {plan.mode === "study" && studyBlockCount > 0 && (
        <p className="round-label">
          Round {Math.max(1, currentStudyBlockNumber)} of {studyBlockCount}
        </p>
      )}

      <div className="visual-wrap">
        <Visual
          visual={plan.visual}
          progress={progress}
          remainingMs={remainingMs}
        />
      </div>

      {!state.awaitingAdvance && currentPhase.kind === "break" && (
        <p className="break-copy">
          Stand up. Get some water. Come back when SUNDIAL rings.
        </p>
      )}

      {state.awaitingAdvance ? (
        <>
          <p className="next-phase">
            {currentPhase.kind === "break"
              ? "Ready for your break."
              : "Ready to keep studying."}
          </p>
          <button
            type="button"
            className="primary"
            onClick={() => void api.advancePhase()}
          >
            {currentPhase.kind === "break" ? "Start Break" : "Start Study"}
          </button>
        </>
      ) : (
        <div className="controls">
          <button
            type="button"
            onClick={() => void (state.isPaused ? api.resume() : api.pause())}
          >
            {state.isPaused ? "Resume" : "Pause"}
          </button>
          <button type="button" onClick={() => void api.addMinutes(5)}>
            +5
          </button>
          <button type="button" onClick={() => void api.advancePhase()}>
            Skip
          </button>
          <button type="button" onClick={() => void api.reset()}>
            Reset
          </button>
        </div>
      )}

      {nextPhase && !state.awaitingAdvance && (
        <p className="next-phase">
          Next: {formatClock(nextPhase.durationMs)}{" "}
          {nextPhase.kind === "study" ? "Study" : "Break"}
        </p>
      )}
    </div>
  );
}
