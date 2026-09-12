import { useState } from "react";
import { useTimer } from "./useTimer";
import { StudyPlanner } from "./StudyPlanner";
import { TimerPlanner } from "./TimerPlanner";
import { ActiveSession } from "./ActiveSession";
import { SettingsScreen } from "./SettingsScreen";
import { playSound } from "./audio";
import type { PhaseKind } from "./types";

type Tab = "study" | "timer" | "settings";

export function MainApp() {
  const [tab, setTab] = useState<Tab>("study");
  const [dismissedRestore, setDismissedRestore] = useState(false);

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

  if (!state || !settings) {
    return <div className="app-shell" />;
  }

  const restoreCount = restore?.phasesCompletedWhileAway.length ?? 0;
  const showRestoreBanner = !dismissedRestore && restoreCount > 0;

  if (state.isRunning) {
    return (
      <div className="app-shell">
        {showRestoreBanner && (
          <div className="restore-banner">
            <span>
              Welcome back - {restoreCount} phase{restoreCount === 1 ? "" : "s"}{" "}
              finished while SUNDIAL was closed.
            </span>
            <button type="button" onClick={() => setDismissedRestore(true)}>
              Dismiss
            </button>
          </div>
        )}
        <ActiveSession state={state} remainingMs={remainingMs} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <nav className="tabs">
        <button
          type="button"
          className={tab === "study" ? "selected" : ""}
          onClick={() => setTab("study")}
        >
          Study
        </button>
        <button
          type="button"
          className={tab === "timer" ? "selected" : ""}
          onClick={() => setTab("timer")}
        >
          Timer
        </button>
        <button
          type="button"
          className={tab === "settings" ? "selected" : ""}
          onClick={() => setTab("settings")}
        >
          Settings
        </button>
      </nav>
      {tab === "study" && (
        <StudyPlanner settings={settings} customPresets={customPresets} />
      )}
      {tab === "timer" && <TimerPlanner settings={settings} />}
      {tab === "settings" && <SettingsScreen settings={settings} />}
    </div>
  );
}
