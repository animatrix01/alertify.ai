import type { Database } from "@/integrations/supabase/types";

type AlertSeverity = Database["public"]["Enums"]["alert_severity"];

let audioCtx: AudioContext | null = null;
let isPlaying = false;
let gestureUnlocked = false;

// ─── Custom SOS sound file path ───────────────────────────────────────────────
// To use your own sound:
//   1. Drop your .mp3 or .wav file into:  safteyflux-main/public/sounds/
//   2. Change the filename below to match, e.g. "my-siren.mp3"
//   3. Set to null to use the built-in synthesized beep instead
const CUSTOM_SOS_SOUND: string | null = "/sounds/my-siren.mp3.mp3";

// ─── Unlock AudioContext on first user gesture ───────────────────────────────
// Browsers block audio until the user has interacted with the page.
// We listen once for any tap/click/key and resume the context.
function setupGestureUnlock() {
  if (typeof window === "undefined") return;
  if (gestureUnlocked) return;

  const unlock = async () => {
    gestureUnlocked = true;
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      try { await ctx.resume(); } catch { /* ignore */ }
    }
    window.removeEventListener("click", unlock);
    window.removeEventListener("touchstart", unlock);
    window.removeEventListener("keydown", unlock);
  };

  window.addEventListener("click", unlock, { passive: true });
  window.addEventListener("touchstart", unlock, { passive: true });
  window.addEventListener("keydown", unlock, { passive: true });
}

// Call setup immediately when this module loads (client-side only)
if (typeof window !== "undefined") {
  setupGestureUnlock();
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  return audioCtx;
}

/**
 * Plays a severity-based alert chime.
 *
 * - critical → urgent double-beep siren (880Hz → 440Hz, twice)
 * - warning  → single softer descending tone (600Hz → 400Hz)
 * - info / advisory → silent (returns immediately)
 *
 * Safe for: mobile browsers, PWA, future Capacitor APK.
 * Handles autoplay restrictions via gesture-unlock listener above.
 * Prevents overlapping playback via `isPlaying` guard.
 */
export async function playDisasterAlertChime(
  soundEnabled: boolean,
  severity: AlertSeverity,
): Promise<void> {
  if (!soundEnabled) return;
  if (typeof window === "undefined") return;
  if (severity !== "critical" && severity !== "warning") return;
  if (isPlaying) return; // prevent overlap

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === "suspended") await ctx.resume();
    if (ctx.state !== "running") return;
  } catch {
    return;
  }

  isPlaying = true;

  try {
    if (severity === "critical") {
      await playCriticalSiren(ctx);
    } else {
      await playWarningSingle(ctx);
    }
  } catch {
    // Audio errors are non-fatal
  } finally {
    isPlaying = false;
  }
}

// ─── Critical: urgent double-beep (880→440, pause, 880→440) ─────────────────
function playCriticalSiren(ctx: AudioContext): Promise<void> {
  return new Promise((resolve) => {
    const now = ctx.currentTime;
    const beepDuration = 0.18;
    const gap = 0.08;
    const totalDuration = (beepDuration * 2) + gap + 0.05;

    // Beep 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.type = "square";
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(440, now + beepDuration);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.14, now + 0.01);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + beepDuration);
    osc1.start(now);
    osc1.stop(now + beepDuration);

    // Beep 2 (after gap)
    const t2 = now + beepDuration + gap;
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = "square";
    osc2.frequency.setValueAtTime(880, t2);
    osc2.frequency.exponentialRampToValueAtTime(440, t2 + beepDuration);
    gain2.gain.setValueAtTime(0, t2);
    gain2.gain.linearRampToValueAtTime(0.14, t2 + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.001, t2 + beepDuration);
    osc2.start(t2);
    osc2.stop(t2 + beepDuration);

    setTimeout(resolve, totalDuration * 1000 + 50);
  });
}

// ─── Warning: single softer descending tone ──────────────────────────────────
function playWarningSingle(ctx: AudioContext): Promise<void> {
  return new Promise((resolve) => {
    const now = ctx.currentTime;
    const duration = 0.28;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(380, now + duration);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.09, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.start(now);
    osc.stop(now + duration);

    setTimeout(resolve, duration * 1000 + 50);
  });
}

// ─── SOS button sound ─────────────────────────────────────────────────────────
// Called directly when the user taps the SOS button.
// Uses custom file if CUSTOM_SOS_SOUND is set, otherwise falls back to
// the synthesized critical siren.
//
// HOW TO USE YOUR OWN SOUND FILE:
//   1. Put your file in:  safteyflux-main/public/sounds/siren.mp3
//   2. Change CUSTOM_SOS_SOUND at the top of this file to: "/sounds/siren.mp3"
//
let sosAudioEl: HTMLAudioElement | null = null;

export async function playSOSSound(): Promise<void> {
  if (typeof window === "undefined") return;

  // If a custom file is configured, use HTMLAudioElement (simpler, more compatible)
  if (CUSTOM_SOS_SOUND) {
    try {
      // Reuse element to avoid memory leaks
      if (!sosAudioEl) {
        sosAudioEl = new Audio(CUSTOM_SOS_SOUND);
        sosAudioEl.preload = "auto";
      }
      sosAudioEl.currentTime = 0;
      await sosAudioEl.play();
      return;
    } catch {
      // Fall through to synthesized sound if file fails
    }
  }

  // Fallback: synthesized critical siren (no file needed)
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") await ctx.resume();
    if (ctx.state !== "running") return;
    await playCriticalSiren(ctx);
  } catch {
    // Non-fatal
  }
}
