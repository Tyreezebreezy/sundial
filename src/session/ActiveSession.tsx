import { formatDuration, formatTimer, spokenTime } from "../format";
import { nextPhaseLabel, planTotalMs, studyBlockInfo } from "../session";
import { api } from "../tauri";
import { ConfirmButton } from "../ui/ConfirmButton";
import { Icon } from "../ui/Icon";
import { useReducedMotion } from "../useReducedMotion";
import { TimerVisual, type TimerVisualState } from "../visuals/TimerVisual";
import { Sunline } from "../study/Sunline";
import type { TimerState } from "../types";

/**
 * Every state of a session that exists: running, paused, waiting for the
 * next phase, and finished. The visual leads, the exact time follows, the
 * one useful next fact sits below, and controls stay quiet and ranked:
 * Pause/Resume and +5, then Skip, Focus Display, then Reset (destructive,
 * two-step). `onFocusDisplay` is omitted when this is already the view
 * Focus Display is showing, so it never offers to open itself.
 */
export function ActiveSession({
  state,
  remainingMs,
  finishedOnLaunch,
  onFocusDisplay,
}: {
  state: TimerState;
  remainingMs: number;
  finishedOnLaunch: boolean;
  onFocusDisplay?: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const plan = state.plan;
  if (!plan) return null;

  const phases = plan.phases;
  const index = state.currentIndex;
  const current = phases[index];
  const isStudy = plan.mode === "study";
  const identity = plan.label ?? plan.presetName;

  const visual = (visualState: TimerVisualState, progress: number) => (
    <div className="visual-frame visual-frame--hero" aria-hidden="true">
      <TimerVisual
        kind={plan.visual}
        remainingMs={remainingMs}
        durationMs={state.durationMs}
        progress={progress}
        state={visualState}
        size="large"
        reducedMotion={reducedMotion}
      />
    </div>
  );

  // ---- finished (the engine keeps the plan but stops running) ----------
  if (!state.isRunning) {
    const totalMinutes = Math.round(planTotalMs(phases) / 60_000);
    // Opening onto an already-finished session: say so plainly, never a stale timer.
    const heading = finishedOnLaunch
      ? isStudy
        ? "Your session finished"
        : "Your timer finished"
      : isStudy
        ? "Session complete"
        : "Time's up";
    return (
      <section key="complete" className="stage-active" aria-label={heading}>
        <p className="eyebrow" aria-live="polite">
          {heading}
        </p>
        {visual("complete", 0)}
        <p className="readout">
          {isStudy ? formatDuration(totalMinutes) : "00:00"}
        </p>
        <p className="type-meta">{isStudy ? "Total session" : identity}</p>
        {isStudy && (
          <div className="active-sunline">
            <Sunline
              phases={phases}
              live={{ currentIndex: phases.length, elapsedFraction: 1 }}
              compact
            />
          </div>
        )}
        <div className="controls">
          <div className="controls-primary">
            <button
              type="button"
              className="btn btn--primary"
              autoFocus
              onClick={() => void api.reset()}
            >
              Done
            </button>
            {!isStudy && (
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() =>
                  void api.startSession({
                    mode: "timer",
                    phases: [{ kind: "timer", durationMs: 5 * 60_000 }],
                    visual: plan.visual,
                    autoAdvance: true,
                    label: null,
                    presetName: null,
                  })
                }
              >
                +5 minutes
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  // ---- waiting for the owner to start the next phase --------------------
  if (state.awaitingAdvance) {
    const finished = phases[index - 1];
    const focusDone = finished?.kind === "study";
    return (
      <section
        key="awaiting"
        className="stage-active"
        aria-label={focusDone ? "Focus complete" : "Break complete"}
      >
        <p className="eyebrow" aria-live="polite">
          {focusDone ? "Focus complete" : "Break complete"}
        </p>
        {visual("complete", 0)}
        <p className="readout">{formatTimer(finished?.durationMs ?? 0)}</p>
        <p className="type-meta">Next · {nextPhaseLabel(phases, index - 1)}</p>
        <div className="controls">
          <div className="controls-primary">
            <button
              type="button"
              className="btn btn--primary"
              autoFocus
              onClick={() => void api.advancePhase()}
            >
              {current.kind === "break" ? "Start break" : "Start study"}
            </button>
          </div>
          <div className="controls-secondary">
            <ConfirmButton
              label="End session"
              confirmLabel="Confirm end session"
              onConfirm={() => void api.reset()}
            />
          </div>
        </div>
      </section>
    );
  }

  // ---- running / paused ------------------------------------------------
  const paused = state.isPaused;
  const block = studyBlockInfo(phases, index);
  const kindWord =
    current.kind === "study"
      ? "Study"
      : current.kind === "break"
        ? "Break"
        : "Timer";
  const position =
    isStudy && block.total > 0
      ? `${kindWord} · ${block.number} of ${block.total}`
      : kindWord;
  const visualState: TimerVisualState = paused
    ? "paused"
    : current.kind === "study"
      ? "study"
      : current.kind === "break"
        ? "break"
        : "timer";
  const progress = state.durationMs > 0 ? remainingMs / state.durationMs : 0;
  const next = isStudy ? nextPhaseLabel(phases, index) : null;

  return (
    <section
      key={current.kind + index}
      className={`stage-active stage-active--${visualState}`}
      aria-label={position}
    >
      <p className="eyebrow" aria-live="polite">
        {paused ? "Paused" : position}
      </p>
      {identity && <p className="type-meta">{identity}</p>}
      {visual(visualState, progress)}
      <p
        className="readout"
        role="timer"
        aria-label={`${spokenTime(remainingMs)} remaining`}
      >
        {formatTimer(remainingMs)}
      </p>
      <p className="type-meta">
        {paused ? position : next ? `Next · ${next}` : " "}
      </p>

      <div className="controls">
        <div className="controls-primary">
          <button
            type="button"
            className={paused ? "btn btn--primary" : "btn btn--secondary"}
            onClick={() => void (paused ? api.resume() : api.pause())}
          >
            <Icon name={paused ? "play" : "pause"} />
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            aria-label="Add 5 minutes"
            onClick={() => void api.addMinutes(5)}
          >
            +5
          </button>
        </div>
        <div className="controls-secondary">
          {isStudy && (
            <button
              type="button"
              className="btn btn--tertiary"
              onClick={() => void api.advancePhase()}
            >
              {current.kind === "break" ? "Skip break" : "Skip phase"}
            </button>
          )}
          {onFocusDisplay && (
            <button
              type="button"
              className="icon-btn"
              aria-label="Focus Display"
              title="Focus Display (F)"
              onClick={onFocusDisplay}
            >
              <Icon name="expand" />
            </button>
          )}
          <ConfirmButton
            label="Reset"
            confirmLabel="Confirm reset"
            onConfirm={() => void api.reset()}
          />
        </div>
      </div>

      {isStudy && (
        <div className="active-sunline">
          <Sunline
            phases={phases}
            live={{ currentIndex: index, elapsedFraction: 1 - progress }}
            compact
          />
        </div>
      )}
    </section>
  );
}
