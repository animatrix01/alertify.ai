import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type SosReport = Tables<"sos_reports">;
export type SosStatus = "active" | "acknowledged" | "resolved" | "cancelled";

export function useSosReports() {
  const [reports, setReports] = useState<SosReport[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    const { data } = await supabase
      .from("sos_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setReports(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void fetch();

    const channel = supabase
      .channel(`sos_reports_responder_${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sos_reports" },
        (payload) => {
          setReports((prev) => {
            if (payload.eventType === "INSERT")
              return [payload.new as SosReport, ...prev];
            if (payload.eventType === "UPDATE")
              return prev.map((r) =>
                r.id === (payload.new as SosReport).id
                  ? (payload.new as SosReport)
                  : r,
              );
            if (payload.eventType === "DELETE")
              return prev.filter((r) => r.id !== (payload.old as SosReport).id);
            return prev;
          });
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, []);

  const updateStatus = async (id: string, status: SosStatus, notes?: string) => {
    const update: Partial<SosReport> = {
      status,
      ...(notes ? { responder_notes: notes } : {}),
      ...(status === "resolved" ? { resolved_at: new Date().toISOString() } : {}),
    };
    const { error } = await supabase
      .from("sos_reports")
      .update(update)
      .eq("id", id);
    return { error };
  };

  return { reports, loading, updateStatus };
}
