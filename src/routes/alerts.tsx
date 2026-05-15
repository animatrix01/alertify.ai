import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Waves, Flame, Wind, Mountain, Thermometer, Activity, Radio, MapPin, ShieldAlert, Eye, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useDisasterAlerts, type DisasterAlert } from "@/hooks/use-disaster-alerts";
import { usePreferences, meetsSeverity, distanceKm } from "@/hooks/use-preferences";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useAISummary } from "@/hooks/use-ai-summary";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alert Center · Alertify" },
      { name: "description", content: "Live feed of active disaster alerts in your region." },
    ],
  }),
  component: AlertsPage,
});

const typeIcon = (t: DisasterAlert["type"]) => {
  switch (t) {
    case "earthquake": return Activity;
    case "flood": return Waves;
    case "wildfire": return Flame;
    case "storm": return Wind;
    case "tsunami": return Waves;
    case "heatwave": return Thermometer;
    case "landslide": return Mountain;
    default: return AlertTriangle;
  }
};

const sevStyles: Record<DisasterAlert["severity"], string> = {
  critical: "bg-emergency/10 text-emergency border-emergency/30",
  warning: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  advisory: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  info: "bg-sky-500/10 text-sky-700 border-sky-500/30",
};

function AlertsPage() {
  const { alerts, loading } = useDisasterAlerts();
  const { prefs } = usePreferences();
  const geo = useGeolocation(true);
  const [showAll, setShowAll] = useState(false);

  const livePos = geo.status === "ok" ? { lat: geo.lat, lng: geo.lng } : null;
  const cachedPos = geo.lastKnown
    ? { lat: geo.lastKnown.lat, lng: geo.lastKnown.lng }
    : null;
  const userPos = livePos ?? cachedPos;
  const usingCached = !livePos && cachedPos !== null;

  // Radius filter is active only when location sharing is on AND we have a position AND showAll is off
  const radiusActive = prefs.share_location && userPos !== null && !showAll;

  const geoBlocked =
    prefs.share_location &&
    userPos === null &&
    (geo.status === "denied" || geo.status === "error");

  const filtered = useMemo(() => {
    return alerts
      .map((a) => {
        const dist = userPos
          ? distanceKm(userPos, { lat: a.latitude, lng: a.longitude })
          : null;
        return { alert: a, dist };
      })
      .filter(({ alert, dist }) => {
        if (!meetsSeverity(alert.severity, prefs.min_severity)) return false;
        if (radiusActive && dist !== null) {
          return dist <= prefs.alert_radius_km + Number(alert.radius_km);
        }
        return true;
      })
      .sort((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity));
  }, [alerts, prefs, userPos, radiusActive]);

  return (
    <AppShell title="Alert Center">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Radio className="h-3.5 w-3.5 text-emergency animate-pulse" />
          Live · {filtered.length} of {alerts.length}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full glass px-2 py-0.5">
            <ShieldAlert className="h-3 w-3" />
            <span className="capitalize">{prefs.min_severity}+</span>
          </span>
          {radiusActive && (
            <span className="inline-flex items-center gap-1 rounded-full glass px-2 py-0.5">
              <MapPin className="h-3 w-3" />
              {prefs.alert_radius_km}km{usingCached && " · cached"}
            </span>
          )}
          {prefs.share_location && userPos !== null && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 border transition-colors ${
                showAll
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "glass border-transparent text-muted-foreground"
              }`}
            >
              <Eye className="h-3 w-3" />
              {showAll ? "All" : "Nearby"}
            </button>
          )}
        </div>
      </div>

      {geoBlocked && (
        <div className="glass mb-2 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5 text-[11px] text-amber-700">
          <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            Location unavailable — showing all <span className="capitalize font-medium">{prefs.min_severity}+</span> alerts without distance filtering.
          </span>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass h-14 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-xl p-6 text-center text-xs text-muted-foreground space-y-2">
          {radiusActive && alerts.length > 0 ? (
            <>
              <p>No alerts within your {prefs.alert_radius_km}km radius.</p>
              <p className="text-[10px]">There are {alerts.length} alert{alerts.length !== 1 ? "s" : ""} outside your area.</p>
              <button
                onClick={() => setShowAll(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-[11px] font-medium hover:bg-primary/20 transition-colors"
              >
                <Eye className="h-3 w-3" /> Show all {alerts.length} alerts
              </button>
            </>
          ) : (
            <p>No alerts match your preferences. You're all clear.</p>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {filtered.map(({ alert: a, dist }) => (
              <AlertCard key={a.id} alert={a} dist={dist} />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </AppShell>
  );
}

// ── Alert card with expandable AI summary ────────────────────────────────────
function AlertCard({ alert: a, dist }: { alert: DisasterAlert; dist: number | null }) {
  const Icon = typeIcon(a.type);
  const ai = useAISummary(a);
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="glass rounded-xl overflow-hidden"
    >
      {/* ── Compact row (always visible) ── */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2.5 p-3 text-left"
      >
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${sevStyles[a.severity]}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium leading-tight truncate">{a.title}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
            {" · "}
            <span className="capitalize">{a.type}</span>
            {dist !== null && ` · ${dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`} away`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* AI indicator dot */}
          {ai.status === "loading" && (
            <Sparkles className="h-3 w-3 text-primary animate-pulse" />
          )}
          {ai.status === "done" && (
            <Sparkles className="h-3 w-3 text-primary opacity-60" />
          )}
          <span className={`rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-wide ${sevStyles[a.severity]}`}>
            {a.severity}
          </span>
          <span className={`text-[10px] text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}>
            ▾
          </span>
        </div>
      </button>

      {/* ── Expanded detail ── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2 border-t border-border/40 pt-2">
              {/* AI summary */}
              {ai.status === "loading" ? (
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-primary animate-pulse shrink-0" />
                  <div className="h-3 w-40 animate-pulse rounded bg-muted" />
                </div>
              ) : ai.status === "done" ? (
                <div className="flex items-start gap-1.5">
                  <Sparkles className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground/90 leading-relaxed">{ai.summary}</p>
                </div>
              ) : a.description ? (
                <p className="text-xs text-muted-foreground">{a.description}</p>
              ) : null}

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                <span>{a.source ?? "Alertify"}</span>
                <span>·</span>
                <span>{a.radius_km}km radius</span>
                {dist !== null && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-0.5">
                      <MapPin className="h-2.5 w-2.5" />
                      {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`} away
                    </span>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}
