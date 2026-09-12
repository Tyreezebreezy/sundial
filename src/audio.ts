import type { SoundKey } from "./types";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(
  ac: AudioContext,
  startAt: number,
  freq: number,
  durationSec: number,
  volume: number,
  type: OscillatorType = "sine",
) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(volume, startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(startAt);
  osc.stop(startAt + durationSec + 0.05);
}

export function playSound(key: SoundKey, volume: number): void {
  const ac = getCtx();
  const now = ac.currentTime;
  const v = Math.max(0, Math.min(1, volume));

  switch (key) {
    case "bell":
      tone(ac, now, 660, 1.4, v * 0.5, "sine");
      tone(ac, now, 1320, 1.1, v * 0.18, "sine");
      break;
    case "chime":
      tone(ac, now, 880, 0.4, v * 0.45, "sine");
      tone(ac, now + 0.16, 1174, 0.5, v * 0.4, "sine");
      break;
    case "doubleChime":
      tone(ac, now, 784, 0.3, v * 0.4, "sine");
      tone(ac, now + 0.14, 1046, 0.35, v * 0.4, "sine");
      tone(ac, now + 0.42, 784, 0.3, v * 0.4, "sine");
      tone(ac, now + 0.56, 1046, 0.4, v * 0.4, "sine");
      break;
    case "digital":
      tone(ac, now, 1200, 0.09, v * 0.35, "square");
      tone(ac, now + 0.12, 1200, 0.09, v * 0.35, "square");
      tone(ac, now + 0.24, 1600, 0.14, v * 0.35, "square");
      break;
    case "alarm":
      for (let i = 0; i < 4; i++) {
        tone(
          ac,
          now + i * 0.26,
          i % 2 === 0 ? 950 : 700,
          0.2,
          v * 0.5,
          "sawtooth",
        );
      }
      break;
  }
}
