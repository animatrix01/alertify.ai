import { supabase } from "@/integrations/supabase/client";
import type { DisasterAlertRow } from "./types";

const CHANNEL_NAME = "disaster_alerts_browser_push";

/**
 * Subscribes to **INSERT** events on `public.disaster_alerts` via Supabase Realtime.
 * Caller is responsible for permission, prefs (`push_enabled`, `min_severity`), and dedupe.
 */
export function subscribeToRealtimeDisasterAlertInserts(
  onInsert: (row: DisasterAlertRow) => void,
): () => void {
  const channel = supabase
    .channel(`${CHANNEL_NAME}_${Date.now()}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "disaster_alerts",
      },
      (payload) => {
        const row = payload.new as DisasterAlertRow | null;
        if (row?.id) onInsert(row);
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
