import { useMemo } from "react";
import type { DisasterAlert } from "@/hooks/use-disaster-alerts";

export type RiskLevel = "safe" | "low" | "moderate" | "high" | "critical";

export type DashboardMetrics = {
  total: number;
  critical: number;
  warning: number;
  advisory: number;
  info: number;
  riskLevel: RiskLevel;
  riskLabel: string;
  riskColor: string; // tailwind text color class
  lastAlertAt: Date | null;
  recentAlerts: DisasterAlert[]; // latest 5
};

/**
 * Derives all dashboard metrics from the alerts array already fetched by
 * useDisasterAlerts. No extra Supabase subscription — zero duplication.
 */
export function useDashboardMetrics(alerts: DisasterAlert[]): DashboardMetrics {
  return useMemo(() => {
    const total = alerts.length;
    const critical = alerts.filter((a) => a.severity === "critical").length;
    const warning = alerts.filter((a) => a.severity === "warning").length;
    const advisory = alerts.filter((a) => a.severity === "advisory").length;
    const info = alerts.filter((a) => a.severity === "info").length;

    const lastAlertAt =
      alerts.length > 0 ? new Date(alerts[0].created_at) : null;

    const recentAlerts = alerts.slice(0, 5);

    // ── Risk engine ──────────────────────────────────────────────────────────
    let riskLevel: RiskLevel;
    if (total === 0) {
      riskLevel = "safe";
    } else if (critical >= 3) {
      riskLevel = "critical";
    } else if (critical >= 1) {
      riskLevel = "high";
    } else if (warning >= 1) {
      riskLevel = "moderate";
    } else if (advisory >= 1 || info >= 1) {
      riskLevel = "low";
    } else {
      riskLevel = "safe";
    }

    const RISK_META: Record<RiskLevel, { label: string; color: string }> = {
      safe:     { label: "Safe Zone",      color: "text-success" },
      low:      { label: "Low Risk",       color: "text-sky-500" },
      moderate: { label: "Moderate Risk",  color: "text-warning" },
      high:     { label: "High Risk",      color: "text-orange-500" },
      critical: { label: "Critical Zone",  color: "text-emergency" },
    };

    return {
      total,
      critical,
      warning,
      advisory,
      info,
      riskLevel,
      riskLabel: RISK_META[riskLevel].label,
      riskColor: RISK_META[riskLevel].color,
      lastAlertAt,
      recentAlerts,
    };
  }, [alerts]);
}
