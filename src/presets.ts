import type { Preset } from "./types";

export const BUILT_IN_PRESETS: Preset[] = [
  { id: "deep-study", name: "Deep Study", studyMinutes: 45, breakMinutes: 15 },
  {
    id: "classic-pomodoro",
    name: "Classic Pomodoro",
    studyMinutes: 25,
    breakMinutes: 5,
  },
  { id: "quick", name: "Quick", studyMinutes: 15, breakMinutes: 5 },
  { id: "standard", name: "Standard", studyMinutes: 30, breakMinutes: 10 },
  { id: "extended", name: "Extended", studyMinutes: 50, breakMinutes: 10 },
  { id: "long", name: "Long", studyMinutes: 60, breakMinutes: 15 },
];

export const TIMER_PRESET_MINUTES = [5, 10, 15, 25, 30, 45, 60, 90, 120];
