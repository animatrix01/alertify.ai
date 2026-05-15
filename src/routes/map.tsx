import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useDisasterAlerts, severityColor } from "@/hooks/use-disaster-alerts";
import { usePreferences, meetsSeverity, distanceKm } from "@/hooks/use-preferences";
import { Crosshair, Layers, Radio, MapPin, ShieldAlert } from "lucide-react";

// Leaflet touches `window` — load it only on the client.
const DisasterMap = lazy(() =>
  import("@/components/map/DisasterMap").then((m) => ({ default: m.DisasterMap })),
);

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Disaster Map · Alertify" },
      {
        name: "description",
        content: "Live map of active disaster zones, your location, and safe areas.",
      },
    ],
  }),
  component: MapScreen,
});

function MapScreen() {
  const geo = useGeolocation(true);
  const { alerts, loading } = useDisasterAlerts();
  const { prefs } = usePreferences();
  const [mounted, setMounted] = useState(false);

  // Only render Leaflet after first client paint
  if (typeof window !== "undefined" && !mounted) {
    queueMicrotask(() => setMounted(true));
  }

  const livePos = geo.status === "ok" ? { lat: geo.lat, lng: geo.lng } : null;
  const cachedPos = geo.lastKnown
    ? { lat: geo.lastKnown.lat, lng: geo.lastKnown.lng }
    : null;
  const userPos = livePos ?? cachedPos;
  const radiusActive = prefs.share_location && userPos !== null;

  const visibleAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (!meetsSeverity(a.severity, prefs.min_severity)) return false;
      if (radiusActive && userPos) {
        const d = distanceKm(userPos, { lat: a.latitude, lng: a.longitude });
        return d <= prefs.alert_radius_km + Number(a.radius_km);
      }
      return true;
    });
  }, [alerts, prefs, userPos, radiusActive]);

  return (
    <AppShell title="Live Disaster Map">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong relative overflow-hidden rounded-2xl"
        style={{ height: "56vh" }}
      >
        {mounted ? (
          <Suspense fallback={<MapSkeleton />}>
            <DisasterMap
              alerts={visibleAlerts}
              user={userPos}
              userRadiusKm={radiusActive ? prefs.alert_radius_km : null}
            />
          </Suspense>
        ) : (
          <MapSkeleton />
        )}

        {/* Radar scan overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, transparent 60%, oklch(0.62 0.24 27 / 0.06) 100%)",
          }}
        />

        <div className="absolute right-2 top-2 flex flex-col gap-1.5">
          <button
            className="glass-strong flex h-8 w-8 items-center justify-center rounded-full text-foreground active:scale-95"
            aria-label="Center on me"
          >
            <Crosshair className="h-3.5 w-3.5" />
          </button>
          <button
            className="glass-strong flex h-8 w-8 items-center justify-center rounded-full text-foreground active:scale-95"
            aria-label="Layers"
          >
            <Layers className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="glass-strong absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full px-2.5 py-1">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emergency opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emergency" />
          </span>
          <Radio className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] font-medium text-foreground">
            {loading
              ? "Syncing…"
              : `${visibleAlerts.length} of ${alerts.length} zones`}
          </span>
        </div>

        <div className="glass-strong absolute bottom-2 right-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] text-muted-foreground">
          <ShieldAlert className="h-2.5 w-2.5" />
          <span className="capitalize">{prefs.min_severity}+</span>
          {radiusActive && (
            <>
              <span>·</span>
              <MapPin className="h-2.5 w-2.5" />
              <span>{prefs.alert_radius_km}km</span>
            </>
          )}
        </div>
      </motion.div>

      {/* Legend / status */}
      <div className="glass mt-2 rounded-xl p-2.5">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Severity
        </p>
        <div className="mt-1.5 flex items-center justify-between text-[11px]">
          {(["critical", "warning", "advisory", "info"] as const).map((s) => (
            <div key={s} className="flex items-center gap-1">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: severityColor(s) }}
              />
              <span className="capitalize text-foreground">{s}</span>
            </div>
          ))}
        </div>
        {geo.status === "denied" && (
          <p className="mt-2 text-[11px] text-emergency">
            Location permission denied. Enable it for accurate alerts.
          </p>
        )}
        {geo.status === "loading" && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Locating you…
          </p>
        )}
      </div>
    </AppShell>
  );
}

function MapSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted/40 text-sm text-muted-foreground">
      Loading map…
    </div>
  );
}
