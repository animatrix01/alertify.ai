import type { Database } from "@/integrations/supabase/types";
import type { DisasterAlertRow } from "./types";

type AlertType = Database["public"]["Enums"]["alert_type"];

const TYPE_LABEL: Record<AlertType, string> = {
  earthquake: "Earthquake",
  flood: "Flood",
  wildfire: "Wildfire",
  storm: "Storm",
  tsunami: "Tsunami",
  heatwave: "Heatwave",
  landslide: "Landslide",
  other: "Disaster",
};

const SEVERITY_PREFIX: Record<Database["public"]["Enums"]["alert_severity"], string> = {
  info: "ℹ️",
  advisory: "📢",
  warning: "⚠️",
  critical: "🚨",
};

function typeLabel(type: AlertType): string {
  return TYPE_LABEL[type] ?? "Alert";
}

export function formatAlertCoordinates(alert: DisasterAlertRow): string {
  const lat = Number(alert.latitude);
  const lng = Number(alert.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return "Location unavailable";
  }
  return `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;
}

export function buildDisasterNotificationTitle(alert: DisasterAlertRow): string {
  const prefix = SEVERITY_PREFIX[alert.severity] ?? "";
  const kind = typeLabel(alert.type);
  const sev =
    alert.severity === "critical"
      ? "Emergency"
      : alert.severity === "warning"
        ? "Warning"
        : alert.severity === "advisory"
          ? "Advisory"
          : "Update";
  return `${prefix} ${kind} ${sev}`.replace(/\s+/g, " ").trim();
}

export function buildDisasterNotificationBody(alert: DisasterAlertRow): string {
  const lines: string[] = [];
  const headline = alert.title?.trim();
  if (headline) lines.push(headline);
  const desc = alert.description?.trim();
  if (desc) lines.push(desc);
  lines.push(`Near ${formatAlertCoordinates(alert)}`);
  return lines.join("\n");
}
