import type { DisasterAlertRow } from "./types";
import { buildDisasterNotificationBody, buildDisasterNotificationTitle } from "./alert-copy";
import { requireInteractionForSeverity, vibratePatternForSeverity } from "./severity-priority";
import { markAlertNotified, wasAlertAlreadyNotified } from "./dedupe";
import { playDisasterAlertChime } from "./sound";
import { shouldRegisterServiceWorker } from "./register-sw";

function buildNotificationOptions(alert: DisasterAlertRow): NotificationOptions {
  const vibrate = vibratePatternForSeverity(alert.severity);
  return {
    body: buildDisasterNotificationBody(alert),
    tag: `disaster-alert:${alert.id}`,
    requireInteraction: requireInteractionForSeverity(alert.severity),
    ...(vibrate.length > 0 ? { vibrate } : {}),
    silent: false,
    data: {
      url: "/alerts",
      alertId: alert.id,
      severity: alert.severity,
      type: alert.type,
    },
  };
}

/**
 * Shows a system notification for a disaster alert (Web Notifications API).
 * Uses ServiceWorkerRegistration.showNotification when an SW is active (PWA/APK-friendly),
 * otherwise falls back to `new Notification()`.
 */
export async function sendDisasterAlertNotification(
  alert: DisasterAlertRow,
  opts: { soundEnabled: boolean },
): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }
  if (wasAlertAlreadyNotified(alert.id)) return;

  const title = buildDisasterNotificationTitle(alert);
  const options = buildNotificationOptions(alert);

  let shown = false;

  // Always try SW first — required on mobile Chrome, better for PWA
  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, options);
      shown = true;
    } catch {
      /* fall through to direct Notification */
    }
  }

  if (!shown) {
    try {
      const n = new Notification(title, options);
      void n;
      shown = true;
    } catch {
      return;
    }
  }

  if (shown) {
    markAlertNotified(alert.id);
    void playDisasterAlertChime(opts.soundEnabled, alert.severity);
  }
}

/**
 * Optional path: ask the SW to display via postMessage (useful if window.showNotification is restricted).
 */
export async function sendDisasterAlertViaServiceWorkerMessage(
  alert: DisasterAlertRow,
): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  const controller = reg.active;
  if (!controller) return;
  const title = buildDisasterNotificationTitle(alert);
  const options = buildNotificationOptions(alert);
  controller.postMessage({
    type: "SHOW_DISASTER_ALERT",
    payload: { title, options },
  });
}
