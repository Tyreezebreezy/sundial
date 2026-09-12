import { useTimer } from "./useTimer";
import { api } from "./tauri";
import { Disk } from "./visuals/Disk";
import { Hourglass } from "./visuals/Hourglass";
import { Sundial } from "./visuals/Sundial";
import { formatClock } from "./format";
import type { PhaseKind, VisualKind } from "./types";

function Visual({
  visual,
  progress,
  remainingMs,
  size,
}: {
  visual: VisualKind;
  progress: number;
  remainingMs: number;
  size: number;
}) {
  if (visual === "hourglass")
    return (
      <Hourglass progress={progress} remainingMs={remainingMs} size={size} />
    );
  if (visual === "sundial")
    return (
      <Sundial progress={progress} remainingMs={remainingMs} size={size} />
    );
  return <Disk progress={progress} remainingMs={remainingMs} size={size} />;
}

export function Widget() {
  // The widget never plays audio itself, avoiding double playback with the
  // main window - it stays a silent, always-available view of the engine.
  const { state, settings, remainingMs } = useTimer((_kind: PhaseKind) => {});

  if (!state || !settings) return null;

  const size = settings.widgetSize;
  const visualSize = size === "small" ? 40 : size === "large" ? 96 : 68;
  const plan = state.plan;
  const currentPhase = plan?.phases[state.currentIndex];
  const phaseLabel = !currentPhase
    ? "SUNDIAL"
    : currentPhase.kind === "study"
      ? "STUDY"
      : currentPhase.kind === "break"
        ? "BREAK"
        : "TIMER";
  const nextPhase = plan?.phases[state.currentIndex + 1];
  const progress = state.durationMs > 0 ? remainingMs / state.durationMs : 0;
  const studyBlockCount =
    plan?.phases.filter((p) => p.kind === "study").length ?? 0;
  const currentStudyBlockNumber =
    plan?.phases
      .slice(0, state.currentIndex + 1)
      .filter((p) => p.kind === "study").length ?? 0;

  return (
    <div className={`widget widget-${size}`} data-tauri-drag-region>
      {size === "large" && plan?.label && (
        <div className="widget-label">{plan.label}</div>
      )}
      {size !== "small" && (
        <div className="widget-phase">
          {phaseLabel}
          {size === "large" &&
            plan?.mode === "study" &&
            studyBlockCount > 0 && (
              <span className="widget-round">
                {" "}
                {currentStudyBlockNumber}/{studyBlockCount}
              </span>
            )}
        </div>
      )}

      <div className="widget-visual">
        <Visual
          visual={plan?.visual ?? settings.defaultVisual}
          progress={progress}
          remainingMs={remainingMs}
          size={visualSize}
        />
      </div>

      {size === "large" && nextPhase && (
        <div className="widget-next">
          Next: {formatClock(nextPhase.durationMs)}{" "}
          {nextPhase.kind === "study" ? "Study" : "Break"}
        </div>
      )}

      <div className="widget-controls">
        {state.isRunning && !state.awaitingAdvance && (
          <>
            <button
              type="button"
              onClick={() => void (state.isPaused ? api.resume() : api.pause())}
              title={state.isPaused ? "Resume" : "Pause"}
              aria-label={state.isPaused ? "Resume" : "Pause"}
            >
              {state.isPaused ? "▶" : "❚❚"}
            </button>
            <button
              type="button"
              onClick={() => void api.addMinutes(5)}
              title="+5 minutes"
              aria-label="Add 5 minutes"
            >
              +5
            </button>
            <button
              type="button"
              onClick={() => void api.advancePhase()}
              title="Skip phase"
              aria-label="Skip phase"
            >
              ⏭
            </button>
            <button
              type="button"
              onClick={() => void api.reset()}
              title="Reset"
              aria-label="Reset"
            >
              ⟲
            </button>
          </>
        )}
        {state.awaitingAdvance && (
          <button
            type="button"
            onClick={() => void api.advancePhase()}
            title="Start next phase"
            aria-label="Start next phase"
          >
            ▶
          </button>
        )}
        <button
          type="button"
          onClick={() => void api.openMainWindow()}
          title="Open SUNDIAL"
          aria-label="Open SUNDIAL"
        >
          ⤢
        </button>
      </div>
    </div>
  );
}
