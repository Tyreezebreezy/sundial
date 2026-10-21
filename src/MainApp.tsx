import { useEffect, useRef, useState } from "react";
import { useTimer } from "./useTimer";
import { useShortcuts } from "./useShortcuts";
import { onFocusDisplayRequested } from "./tauri";
import { AppShell, type Section } from "./shell/AppShell";
import { StudySetup } from "./study/StudySetup";
import { TimerSetup } from "./timer/TimerSetup";
import { ActiveSession } from "./session/ActiveSession";
import { FocusDisplay } from "./session/FocusDisplay";
import { SettingsScreen } from "./settings/SettingsScreen";
import { playSound } from "./audio";
import type { PhaseKind } from "./types";

/**
 * Chooses the surface from the engine's state:
 *   no plan            -> setup (Study / Timer)
 *   plan, running      -> active (running, paused, or waiting for the owner)
 *   plan, not running  -> finished (Session complete / Time's up)
 * Settings is a view over any of them, never a mode of its own.
 */
export function MainApp() {
  const [section, setSection] = useState<Section>("study");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusDisplay, setFocusDisplay] = useState(false);
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const bootRestored = useRef<boolean | null>(null);
  const bootFinished = useRef<boolean | null>(null);

  const { state, settings, customPresets, restore, remainingMs } = useTimer(
    (kind: PhaseKind) => {
      if (!settings || !settings.soundEnabled) return;
      const key =
        kind === "study"
          ? settings.soundStudyComplete
          : kind === "break"
            ? settings.soundBreakComplete
            : settings.soundTimerComplete;
      playSound(key, settings.volume);
    },
  );

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void onFocusDisplayRequested(() => {
      if (!disposed) setFocusDisplay(true);
    }).then((unlisten) => {
      if (disposed) unlisten();
      else cleanup = unlisten;
    });
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  useShortcuts({
    state,
    onEnterFocusDisplay: () => setFocusDisplay(true),
    onExitOverlay: () => {
      setSettingsOpen(false);
      setFocusDisplay(false);
    },
  });

  useEffect(() => {
    if (!state?.plan) setFocusDisplay(false);
  }, [state?.plan]);

  if (!state || !settings) {
    return <div className="app" />;
  }

  // What SUNDIAL opened onto - decided once, at first render, and forgotten
  // as soon as that session is over. (The engine reconciles wall-clock time
  // before the UI exists, so all we can truthfully say is what state we
  // launched into: running/paused/waiting = restored, finished = finished.)
  if (bootRestored.current === null) {
    bootRestored.current = Boolean(
      state.isRunning && restore?.hadActiveSession,
    );
    bootFinished.current = Boolean(state.plan && !state.isRunning);
  }
  if (!state.plan) bootFinished.current = false;
  if (!state.isRunning) bootRestored.current = false;

  const restoredCount = restore?.phasesCompletedWhileAway.length ?? 0;
  const notice =
    bootRestored.current && !noticeDismissed ? (
      <div className="notice" role="status">
        <span>
          {restoredCount > 0
            ? `Welcome back · ${restoredCount} phase${restoredCount === 1 ? "" : "s"} finished while SUNDIAL was closed.`
            : "Session restored."}
        </span>
        <button
          type="button"
          className="btn btn--tertiary btn--compact"
          onClick={() => setNoticeDismissed(true)}
        >
          Dismiss
        </button>
      </div>
    ) : null;

  const plan = state.plan;

  if (focusDisplay && plan) {
    return (
      <FocusDisplay
        state={state}
        remainingMs={remainingMs}
        onExit={() => setFocusDisplay(false)}
      />
    );
  }

  let content;
  if (settingsOpen) {
    content = <SettingsScreen settings={settings} />;
  } else if (plan) {
    content = (
      <ActiveSession
        state={state}
        remainingMs={remainingMs}
        finishedOnLaunch={bootFinished.current === true}
        onFocusDisplay={() => setFocusDisplay(true)}
      />
    );
  } else if (section === "study") {
    content = <StudySetup settings={settings} customPresets={customPresets} />;
  } else {
    content = <TimerSetup settings={settings} />;
  }

  return (
    <AppShell
      showNav={!plan && !settingsOpen}
      section={section}
      onSection={setSection}
      settingsOpen={settingsOpen}
      onToggleSettings={() => setSettingsOpen((open) => !open)}
      notice={notice}
    >
      {content}
    </AppShell>
  );
}
