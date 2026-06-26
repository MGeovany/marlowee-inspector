import { toast } from "sonner";

import type { LogEntry } from "./types";

let lastSoundAt = 0;
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioContext) audioContext = new Ctx();
  return audioContext;
}

/** Unlock Web Audio after first user gesture (browser autoplay policy). */
export function unlockErrorAlertAudio(): void {
  void getAudioContext()?.resume();
}

export function playErrorAlertSound(): void {
  const now = Date.now();
  if (now - lastSoundAt < 1200) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  lastSoundAt = now;

  const playTone = (
    frequency: number,
    startOffset: number,
    duration: number,
    peakGain = 0.22,
    type: OscillatorType = "sine",
  ) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = ctx.currentTime + startOffset;

    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peakGain, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  };

  void ctx.resume().then(() => {
    playTone(659.25, 0, 0.12, 0.24);
    playTone(880, 0.11, 0.18, 0.28);
    playTone(1174.66, 0.24, 0.14, 0.2, "triangle");
  }).catch(() => {
    /* autoplay blocked until user interacts */
  });
}

function truncateMessage(message: string, max = 96): string {
  const line = message.split("\n")[0].trim();
  if (line.length <= max) return line;
  return `${line.slice(0, max - 1)}…`;
}

export function clearAllErrorNotifications(): void {
  toast.dismiss();
}

export function notifyNewErrors(
  entries: LogEntry[],
  onView?: (entry: LogEntry) => void,
): void {
  if (entries.length === 0) return;

  playErrorAlertSound();

  const sorted = [...entries].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const visible = sorted.slice(0, 3);

  for (const entry of visible) {
    toast.error(`New error · ${entry.app}`, {
      id: `error-${entry.id}`,
      description: truncateMessage(entry.message),
      duration: Infinity,
      action: onView
        ? {
            label: "View",
            onClick: () => {
              onView(entry);
              toast.dismiss(`error-${entry.id}`);
            },
          }
        : undefined,
    });
  }

  const remaining = sorted.length - visible.length;
  if (remaining > 0) {
    toast.message(`${remaining} more new error${remaining === 1 ? "" : "s"}`, {
      id: `error-batch-${sorted[0]?.id ?? "batch"}`,
      duration: Infinity,
    });
  }

  toast.message(
    `${sorted.length} new error${sorted.length === 1 ? "" : "s"}`,
    {
      id: "error-clear-all",
      duration: Infinity,
      action: {
        label: "Clear all",
        onClick: clearAllErrorNotifications,
      },
    },
  );
}
