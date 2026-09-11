import type { Phase } from "./types";

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
