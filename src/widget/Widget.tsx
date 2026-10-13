import { useEffect, useRef, useState } from "react";
import { api } from "../tauri";
import { Icon, type IconName } from "../ui/Icon";
import { useReducedMotion } from "../useReducedMotion";
import { useTimer } from "../useTimer";
import { Sunline } from "../study/Sunline";
import { TimerVisual } from "../visuals/TimerVisual";
import type { PhaseKind } from "../types";
import { widgetView, type WidgetView } from "./widgetView";

interface Action {
  label: string;
  run: () => void;
  icon?: IconName;
  text?: string;
  tone?: "primary" | "quit";
}

/**
 * Primary controls are what you reach for while timing; everything else sits
 * behind "more" so the widget never shows every control at once. Every
 * control is a real button: hover reveals them, keyboard focus does too.
 */
function actionsFor(
  view: WidgetView,
  size: "small" | "medium" | "large",
  more: boolean,
  setMore: (m: boolean) => void,
): Action[] {
  const open: Action = {
    label: "Open SUNDIAL",
    icon: "open",
    run: () => void api.openMainWindow(),
  };
  const quit: Action = {
    label: "Quit SUNDIAL",
    icon: "power",
    tone: "quit",
    run: () => void api.quit(),
  };
  const moreBtn: Action = {
    label: "More actions",
    icon: "more",
    run: () => setMore(true),
  };
  const back: Action = {
    label: "Back",
    icon: "back",
    run: () => setMore(false),
  };
  const isStudy = view.block !== null;

  switch (view.mode) {
    case "idle":
      return [open, quit];
    case "awaiting": {
      const startLabel =
        view.label === "Focus complete" ? "Start break" : "Start study";
      const start: Action = {
        label: startLabel,
        text: size === "small" ? "Start" : startLabel,
        tone: "primary",
        run: () => void api.advancePhase(),
      };
      return more
        ? [
            back,
            {
              label: "End session",
              icon: "reset",
              run: () => void api.reset(),
            },
            open,
            quit,
          ]
        : [start, moreBtn];
    }
    case "complete": {
      const done: Action = {
        label: "Done",
        text: "Done",
        tone: "primary",
        run: () => void api.reset(),
      };
      return more ? [back, open, quit] : [done, moreBtn];
    }
    default: {
      const paused = view.mode === "paused";
      const toggle: Action = paused
        ? {
            label: "Resume",
            icon: "play",
            tone: "primary",
            run: () => void api.resume(),
          }
        : {
            label: "Pause",
            icon: "pause",
            tone: "primary",
            run: () => void api.pause(),
          };
      const plus: Action = {
        label: "Add 5 minutes",
        text: "+5",
        run: () => void api.addMinutes(5),
      };
      const skip: Action = {
        label: "Skip phase",
        icon: "skip",
        run: () => void api.advancePhase(),
      };
      const reset: Action = {
        label: "Reset",
        icon: "reset",
        run: () => void api.reset(),
      };
      return more
        ? [back, ...(isStudy ? [skip] : []), reset, open, quit]
        : [toggle, plus, moreBtn];
    }
  }
}

/** Time floating on the desktop: the visual and the time first, controls on demand. */
export function Widget() {
  // The widget never plays audio itself, avoiding double playback with the
  // main window - it stays a silent, always-available view of the engine.
  const { state, settings, remainingMs } = useTimer((_kind: PhaseKind) => {});
  const reducedMotion = useReducedMotion();
  const [more, setMore] = useState(false);
  const controlsRef = useRef<HTMLDivElement>(null);
  const firstRun = useRef(true);

  // keep keyboard focus inside the widget when the control page changes
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    controlsRef.current
      ?.querySelector<HTMLButtonElement>("button:not([aria-label='Back'])")
      ?.focus();
  }, [more]);

  if (!state || !settings) return null;

  const size = settings.widgetSize;
  const view = widgetView(state, remainingMs);
  const actions = actionsFor(view, size, more, setMore);
  const info =
    size === "large"
      ? view.next
      : size === "medium"
        ? view.block
        : view.shortLabel;

  return (
    <div
      className={`widget widget--${size} widget--${view.mode}${more ? " widget--more" : ""}`}
      role="group"
      aria-label="SUNDIAL timer"
      onPointerLeave={() => setMore(false)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null))
          setMore(false);
      }}
    >
      <div className="widget-drag" data-tauri-drag-region />
      <div className="widget-content">
        {size === "large" && (
          <header className="widget-head">
            <p className="widget-title">{view.title}</p>
            <p className="widget-sub">{view.line2}</p>
          </header>
        )}
        {size === "medium" && <p className="widget-label">{view.label}</p>}

        <div className="visual-frame widget-visual" aria-hidden="true">
          <TimerVisual
            kind={state.plan?.visual ?? settings.defaultVisual}
            remainingMs={remainingMs}
            durationMs={state.durationMs}
            progress={view.progress}
            state={view.visualState}
            size="small"
            reducedMotion={reducedMotion}
          />
        </div>

        <p
          className="widget-readout"
          role={view.spoken ? "timer" : undefined}
          aria-label={view.spoken ?? undefined}
        >
          {view.readout}
        </p>

        {size === "large" &&
          view.block !== null &&
          (view.mode === "study" ||
            view.mode === "break" ||
            view.mode === "paused") &&
          state.plan && (
            <div className="widget-sunline" aria-hidden="true">
              <Sunline
                phases={state.plan.phases}
                live={{
                  currentIndex: state.currentIndex,
                  elapsedFraction: 1 - view.progress,
                }}
                compact
              />
            </div>
          )}

        <div className="widget-slot">
          <p className="widget-info">{info}</p>
          <div className="widget-controls" ref={controlsRef}>
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                className={`wbtn${a.tone ? ` wbtn--${a.tone}` : ""}${a.text && !a.icon && a.text.length > 3 ? " wbtn--text" : ""}`}
                aria-label={a.label}
                title={a.label}
                onClick={a.run}
              >
                {a.icon ? <Icon name={a.icon} /> : a.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
