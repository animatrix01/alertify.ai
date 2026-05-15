import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Database } from "@/integrations/supabase/types";

export type Severity = Database["public"]["Enums"]["alert_severity"];

export type Preferences = {
  alert_radius_km: number;
  min_severity: Severity;
  push_enabled: boolean;
  sound_enabled: boolean;
  share_location: boolean;
};

export const DEFAULT_PREFS: Preferences = {
  alert_radius_km: 25,
  min_severity: "info",
  push_enabled: true,
  sound_enabled: true,
  share_location: true,
};

export function usePreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPrefs(DEFAULT_PREFS);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);

    const load = async () => {
      const { data } = await supabase
        .from("user_preferences")
        .select(
          "alert_radius_km,min_severity,push_enabled,sound_enabled,share_location",
        )
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;
      if (data) {
        setPrefs({
          alert_radius_km: Number(data.alert_radius_km),
          min_severity: data.min_severity,
          push_enabled: data.push_enabled,
          sound_enabled: data.sound_enabled,
          share_location: data.share_location,
        });
      }
      setLoading(false);
    };

    load();

    // Use a unique channel name per effect run to avoid Supabase
    // "cannot add callbacks after subscribe()" when React double-invokes effects.
    const channelName = `prefs_${user.id}_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_preferences",
          filter: `user_id=eq.${user.id}`,
        },
        () => load(),
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [user]);

  return { prefs, loading };
}

const SEVERITY_RANK: Record<Severity, number> = {
  info: 0,
  advisory: 1,
  warning: 2,
  critical: 3,
};

export function meetsSeverity(sev: Severity, min: Severity) {
  return SEVERITY_RANK[sev] >= SEVERITY_RANK[min];
}

// Haversine distance in km
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}
