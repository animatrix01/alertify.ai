import { useEffect, useState } from "react";
import { getAlertAISummary } from "@/services/ai/groq";
import type { DisasterAlert } from "@/hooks/use-disaster-alerts";

// In-memory cache: alertId → summary string
// Persists for the lifetime of the browser session (no duplicate API calls)
const summaryCache = new Map<string, string>();

type SummaryState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; summary: string }
  | { status: "error"; fallback: string };

/**
 * Fetches an AI-generated summary for a single disaster alert.
 * Results are cached in memory — same alert ID never calls the API twice.
 * Falls back to raw description on any error.
 */
export function useAISummary(alert: DisasterAlert): SummaryState {
  const [state, setState] = useState<SummaryState>(() => {
    // Hydrate from cache immediately if available
    const cached = summaryCache.get(alert.id);
    return cached ? { status: "done", summary: cached } : { status: "idle" };
  });

  useEffect(() => {
    if (summaryCache.has(alert.id)) {
      setState({ status: "done", summary: summaryCache.get(alert.id)! });
      return;
    }

    setState({ status: "loading" });

    getAlertAISummary({
      data: {
        alertId: alert.id,
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
      },
    })
      .then((summary: string) => {
        summaryCache.set(alert.id, summary);
        setState({ status: "done", summary });
      })
      .catch(() => {
        const fallback = alert.description ?? `${alert.severity} ${alert.type} alert.`;
        summaryCache.set(alert.id, fallback);
        setState({ status: "error", fallback });
      });
  // Only re-run if the alert ID changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alert.id]);

  return state;
}

/**
 * Bulk version — fetches summaries for multiple alerts.
 * Returns a Map of alertId → summary string.
 * Used by the dashboard AI insight card.
 */
export function useAIInsight(alerts: DisasterAlert[]): {
  insight: string | null;
  loading: boolean;
} {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Use the most severe alert as the basis for the insight
  const topAlert = alerts.find((a) => a.severity === "critical")
    ?? alerts.find((a) => a.severity === "warning")
    ?? alerts[0];

  const cacheKey = topAlert ? `insight_${topAlert.id}` : null;

  useEffect(() => {
    if (!topAlert) {
      setInsight(null);
      return;
    }
    if (cacheKey && summaryCache.has(cacheKey)) {
      setInsight(summaryCache.get(cacheKey)!);
      return;
    }

    setLoading(true);
    getAlertAISummary({
      data: {
        alertId: topAlert.id,
        type: topAlert.type,
        severity: topAlert.severity,
        title: topAlert.title,
        description: topAlert.description,
      },
    })
      .then((summary: string) => {
        if (cacheKey) summaryCache.set(cacheKey, summary);
        setInsight(summary);
        setLoading(false);
      })
      .catch(() => {
        setInsight(topAlert.description ?? null);
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topAlert?.id]);

  return { insight, loading };
}
