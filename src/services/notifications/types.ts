import type { Database } from "@/integrations/supabase/types";

export type DisasterAlertRow = Database["public"]["Tables"]["disaster_alerts"]["Row"];

/** Maps DB severities to UX tiers (low / medium / high / critical). */
export type NotificationPriorityTier = "low" | "medium" | "high" | "critical";

export type BrowserNotificationPermissionState = "granted" | "denied" | "default" | "unsupported";
