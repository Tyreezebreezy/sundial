export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Fixed-width countdown: "05:03", or "1:05:03" from one hour up. */
export function formatTimer(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Compact duration for summaries: "45m", "2h", "2h 30m". */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/** Duration as it reads on a button: "45 min", "2h", "1h 30m". */
export function formatMinutesLabel(minutes: number): string {
  return minutes < 60 ? `${minutes} min` : formatDuration(minutes);
}

/** Time remaining for assistive tech: "32 minutes 18 seconds". */
export function spokenTime(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const unit = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const parts: string[] = [];
  if (hours) parts.push(unit(hours, "hour"));
  if (minutes) parts.push(unit(minutes, "minute"));
  if (seconds || parts.length === 0) parts.push(unit(seconds, "second"));
  return parts.join(" ");
}
