import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePreferences, meetsSeverity } from "@/hooks/use-preferences";
import { registerAlertifyServiceWorker } from "@/services/notifications/register-sw";
import { subscribeToRealtimeDisasterAlertInserts } from "@/services/notifications/subscribe-disaster-alerts";
import { sendDisasterAlertNotification } from "@/services/notifications/display";
import { playDisasterAlertChime } from "@/services/notifications/sound";

/**
 * Wires Supabase Realtime INSERTs on `disaster_alerts` to:
 *   1. Browser push notifications (if push_enabled + permission granted)
 *   2. In-app sound chime (if sound_enabled) — independent of push permission
 *
 * Sound is decoupled from push so it fires even when notifications are denied.
 * Honors `push_enabled`, `min_severity`, and `sound_enabled` from `usePreferences`.
 */
export function useAlertNotifications() {
  const { user } = useAuth();
  const { prefs, loading } = usePreferences();
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  useEffect(() => {
    void registerAlertifyServiceWorker();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (loading) return;

    const unsubscribe = subscribeToRealtimeDisasterAlertInserts((alert) => {
      const p = prefsRef.current;

      // Sound fires independently — does NOT require push_enabled
      if (meetsSeverity(alert.severity, p.min_severity)) {
        void playDisasterAlertChime(p.sound_enabled, alert.severity);
      }

      // Push notification — requires push_enabled
      if (!p.push_enabled) return;
      if (!meetsSeverity(alert.severity, p.min_severity)) return;
      void sendDisasterAlertNotification(alert, {
        soundEnabled: false,
      });
    });

    return unsubscribe;
  }, [loading]);
}
