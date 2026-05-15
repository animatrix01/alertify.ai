import { useAlertNotifications } from "@/hooks/use-alert-notifications";

/**
 * Mount-only integration for realtime disaster notifications.
 * Renders nothing; keeps logic out of `__root.tsx`.
 */
export function AlertNotificationsManager() {
  useAlertNotifications();
  return null;
}
