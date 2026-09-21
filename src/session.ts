import type { Phase, Preset } from "./types";

/**
 * Lays out study/break phases across a total duration. Never exceeds
 * totalMinutes and shortens the final study block to fit rather than
 * overshooting. A break is only inserted when it fits at full length -
 * one that would have to be truncated is dropped instead, since a
 * shortened trailing break fragment serves no purpose.
 */
export function buildStudySchedule(
  totalMinutes: number,
  studyMinutes: number,
  breakMinutes: number,
): Phase[] {
  if (totalMinutes <= 0 || studyMinutes <= 0) return [];

  const phases: Phase[] = [];
  let remaining = totalMinutes;

  while (remaining > 0) {
    const study = Math.min(studyMinutes, remaining);
    phases.push({ kind: "study", durationMs: study * 60_000 });
    remaining -= study;

    if (remaining <= 0) break;
    if (breakMinutes <= 0 || remaining < breakMinutes) break;

    phases.push({ kind: "break", durationMs: breakMinutes * 60_000 });
    remaining -= breakMinutes;
  }

  return phases;
}

export interface ScheduleSummary {
  totalMinutes: number;
  studyMinutes: number;
  breakMinutes: number;
  studyBlocks: number;
}

export function summarizeSchedule(phases: Phase[]): ScheduleSummary {
  let studyMs = 0;
  let breakMs = 0;
  let studyBlocks = 0;
  for (const phase of phases) {
    if (phase.kind === "study") {
      studyMs += phase.durationMs;
      studyBlocks += 1;
    } else if (phase.kind === "break") {
      breakMs += phase.durationMs;
    }
  }
  return {
    totalMinutes: Math.round((studyMs + breakMs) / 60_000),
    studyMinutes: Math.round(studyMs / 60_000),
    breakMinutes: Math.round(breakMs / 60_000),
    studyBlocks,
  };
}

/** Which study block a phase belongs to: "2 of 3". A break counts the block just finished. */
export function studyBlockInfo(
  phases: Phase[],
  index: number,
): { number: number; total: number } {
  return {
    number: phases.slice(0, index + 1).filter((p) => p.kind === "study").length,
    total: phases.filter((p) => p.kind === "study").length,
  };
}

/** "15m Break" / "Study 2 of 3" for the phase after `index`, or null on the last phase. */
export function nextPhaseLabel(phases: Phase[], index: number): string | null {
  const next = phases[index + 1];
  if (!next) return null;
  if (next.kind === "break")
    return `${Math.round(next.durationMs / 60_000)}m Break`;
  const { number, total } = studyBlockInfo(phases, index + 1);
  return `Study ${number} of ${total}`;
}

export function planTotalMs(phases: Phase[]): number {
  return phases.reduce((sum, p) => sum + p.durationMs, 0);
}

/** The three one-tap session lengths; anything else is "custom". */
export const DURATION_CHOICES = [60, 120, 180] as const;
const MAX_SESSION_MINUTES = 24 * 60;

export function splitMinutes(total: number): {
  hours: number;
  minutes: number;
} {
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

/** Inline validation copy for a custom hours + minutes entry, or null when valid. */
export function customDurationError(
  hours: number,
  minutes: number,
): string | null {
  const total = hours * 60 + minutes;
  if (!Number.isFinite(total) || total <= 0)
    return "Enter a duration greater than 0.";
  if (total > MAX_SESSION_MINUTES) return "Enter 24 hours or less.";
  return null;
}

/** "Repeat last" target: the remembered preset + total, if the preset still exists. */
export function lastConfig(
  lastPresetId: string | null,
  lastTotalMinutes: number | null,
  presets: Preset[],
): { preset: Preset; totalMinutes: number } | null {
  if (!lastPresetId || !lastTotalMinutes || lastTotalMinutes <= 0) return null;
  const preset = presets.find((p) => p.id === lastPresetId);
  return preset ? { preset, totalMinutes: lastTotalMinutes } : null;
}
