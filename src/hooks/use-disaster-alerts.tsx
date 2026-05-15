import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type DisasterAlert = Database["public"]["Tables"]["disaster_alerts"]["Row"];

// ── Shared context — one subscription for the whole app ──────────────────────
type AlertsCtx = { alerts: DisasterAlert[]; loading: boolean };
export const DisasterAlertsContext = createContext<AlertsCtx>({
  alerts: [],
  loading: true,
});

export function useDisasterAlerts() {
  return useContext(DisasterAlertsContext);
}

/**
 * Mount this once at the root. All consumers of useDisasterAlerts()
 * share the same data — no duplicate Supabase channels.
 */
export function DisasterAlertsProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<DisasterAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("disaster_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (!active) return;
      setAlerts(data ?? []);
      setLoading(false);
    })();

    const channel = supabase
      .channel(`disaster_alerts_feed_${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "disaster_alerts" },
        (payload) => {
          setAlerts((prev) => {
            if (payload.eventType === "INSERT")
              return [payload.new as DisasterAlert, ...prev];
            if (payload.eventType === "UPDATE")
              return prev.map((a) =>
                a.id === (payload.new as DisasterAlert).id
                  ? (payload.new as DisasterAlert)
                  : a,
              );
            if (payload.eventType === "DELETE")
              return prev.filter(
                (a) => a.id !== (payload.old as DisasterAlert).id,
              );
            return prev;
          });
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <DisasterAlertsContext.Provider value={{ alerts, loading }}>
      {children}
    </DisasterAlertsContext.Provider>
  );
}

export function severityColor(sev: DisasterAlert["severity"]) {
  switch (sev) {
    case "critical":
      return "var(--color-emergency)";
    case "warning":
      return "oklch(0.7 0.2 40)";
    case "advisory":
      return "var(--color-warning)";
    default:
      return "oklch(0.6 0.1 230)";
  }
}
