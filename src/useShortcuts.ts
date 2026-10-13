import { useEffect } from "react";
import { api } from "./tauri";
import type { TimerState } from "./types";

/** A text field, select, range or other control already consuming keys. */
function isFormControlFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  if ((el as HTMLElement).isContentEditable) return true;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

/**
 * One intentional keyboard layer for the whole app, rather than per-screen
 * document listeners: Space (pause/resume), +/= (add 5 minutes), S (skip,
 * study sessions only), F (enter Focus Display) and Escape (leave whatever
 * overlay is open). Suppressed while a form control has focus or a modifier
 * key is held, so typing a label or a custom duration is never hijacked.
 */
export function useShortcuts({
  state,
  onEnterFocusDisplay,
  onExitOverlay,
}: {
  state: TimerState | null;
  onEnterFocusDisplay: () => void;
  onExitOverlay: () => void;
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onExitOverlay();
        return;
      }
      if (isFormControlFocused() || e.ctrlKey || e.metaKey || e.altKey) return;

      const plan = state?.plan;
      if ((e.key === "f" || e.key === "F") && plan) {
        e.preventDefault();
        onEnterFocusDisplay();
        return;
      }
      if (!plan || !state!.isRunning || state!.awaitingAdvance) return;

      if (e.key === " ") {
        e.preventDefault();
        void (state!.isPaused ? api.resume() : api.pause());
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        void api.addMinutes(5);
      } else if ((e.key === "s" || e.key === "S") && plan.mode === "study") {
        e.preventDefault();
        void api.advancePhase();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [state, onEnterFocusDisplay, onExitOverlay]);
}
