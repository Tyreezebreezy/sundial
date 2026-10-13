import { ActiveSession } from "./ActiveSession";
import type { TimerState } from "../types";

/**
 * A second, bigger presentation of the exact same authoritative session -
 * for a second monitor, across-the-room reading, or a distraction-reduced
 * active view. It owns no state: it renders the same ActiveSession the main
 * window shows, scaled up and full-bleed, so the two can never drift apart.
 * Esc exits (see useShortcuts); the exit button stays out of the way until
 * the owner moves the mouse or tabs to it.
 */
export function FocusDisplay({
  state,
  remainingMs,
  onExit,
}: {
  state: TimerState;
  remainingMs: number;
  onExit: () => void;
}) {
  return (
    <div className="focus-display">
      <ActiveSession
        state={state}
        remainingMs={remainingMs}
        finishedOnLaunch={false}
      />
      <button
        type="button"
        className="btn btn--secondary focus-display-exit"
        onClick={onExit}
      >
        Exit Focus Display
      </button>
    </div>
  );
}
