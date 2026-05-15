import type { BrowserNotificationPermissionState } from "./types";

export function getNotificationSupport(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): BrowserNotificationPermissionState {
  if (!getNotificationSupport()) return "unsupported";
  const p = Notification.permission;
  if (p === "granted" || p === "denied" || p === "default") return p;
  return "default";
}

/**
 * Requests browser notification permission (must run after a user gesture when possible).
 * Returns the resulting permission string.
 */
export async function requestNotificationPermission(): Promise<BrowserNotificationPermissionState> {
  if (!getNotificationSupport()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    const result = await Notification.requestPermission();
    if (result === "granted") return "granted";
    if (result === "denied") return "denied";
    return "default";
  } catch {
    return "default";
  }
}
