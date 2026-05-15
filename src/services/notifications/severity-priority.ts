import type { Database } from "@/integrations/supabase/types";
import type { NotificationPriorityTier } from "./types";

export type AlertSeverity = Database["public"]["Enums"]["alert_severity"];

const SEVERITY_TO_TIER: Record<AlertSeverity, NotificationPriorityTier> = {
  info: "low",
  advisory: "medium",
  warning: "high",
  critical: "critical",
};

export function severityToPriorityTier(severity: AlertSeverity): NotificationPriorityTier {
  return SEVERITY_TO_TIER[severity] ?? "low";
}

/** Vibration patterns (ms) — honored on many Android devices; ignored elsewhere. */
export function vibratePatternForSeverity(severity: AlertSeverity): number[] {
  switch (severity) {
    case "critical":
      return [180, 120, 180, 120, 280];
    case "warning":
      return [140, 80, 140];
    case "advisory":
      return [100, 60, 100];
    default:
      return [80];
  }
}

export function requireInteractionForSeverity(severity: AlertSeverity): boolean {
  return severity === "critical" || severity === "warning";
}
