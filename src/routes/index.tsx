import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { useDisasterAlerts } from "@/hooks/use-disaster-alerts";
import { useDashboardMetrics } from "@/hooks/use-dashboard-metrics";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  AlertTriangle,
  Flame,
  Mountain,
  Radio,
  ShieldCheck,
  Siren,
  Thermometer,
  Waves,
  Wind,
} from "lucide-react";
import type { DisasterAlert } from "@/hooks/use-disaster-alerts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Alertify — Real-time Disaster Alerts & SOS" },
      {
        name: "description",
        content:
          "Alertify delivers life-saving real-time disaster alerts, live maps, and one-tap SOS reporting.",
      },
    ],
  }),
  component: Index,
});

// ── Severity badge styles ────────────────────────────────────────────────────
const SEV_BADGE: Record<DisasterAlert["severity"], string> = {
  critical: "bg-emergency/10 text-emergency border-emergency/30",
  warning:  "bg-orange-500/10 text-orange-500 border-orange-500/30",
  advisory: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  info:     "bg-sky-500/10 text-sky-600 border-sky-500/30",
};

// ── Alert type icon ──────────────────────────────────────────────────────────
function AlertTypeIcon({ type }: { type: DisasterAlert["type"] }) {
  const cls = "h-4 w-4";
  switch (type) {
    case "earthquake": return <Activity className={cls} />;
    case "flood":      return <Waves className={cls} />;
    case "wildfire":   return <Flame className={cls} />;
    case "storm":      return <Wind className={cls} />;
    case "tsunami":    return <Waves className={cls} />;
    case "heatwave":   return <Thermometer className={cls} />;
    case "landslide":  return <Mountain className={cls} />;
    default:           return <AlertTriangle className={cls} />;
  }
}

// ── Animated counter ─────────────────────────────────────────────────────────
function Counter({ value, className }: { value: number; className?: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={value}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.2 }}
        className={className}
      >
        {value}
      </motion.span>
    </AnimatePresence>
  );
}

// ── Risk level pulse dot ─────────────────────────────────────────────────────
function RiskDot({ level }: { level: string }) {
  const color =
    level === "critical" ? "bg-emergency" :
    level === "high"     ? "bg-orange-500" :
    level === "moderate" ? "bg-warning" :
    level === "low"      ? "bg-sky-500" :
                           "bg-success";
  return (
    <span className="relative flex h-2.5 w-2.5">
      {level !== "safe" && (
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${color} opacity-60`} />
      )}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${color}`} />
    </span>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
function Index() {
  const { alerts, loading } = useDisasterAlerts();
  const m = useDashboardMetrics(alerts);

  return (
    <div style={{ minHeight: "100dvh", position: "relative" }}>
      {/* ── Background image — only fills bottom empty space ── */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(100vw, 448px)",
          height: "30vh",
          backgroundImage: "url('/images/alertify background.jpg')",
          backgroundSize: "115%",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
          zIndex: 0,
          maskImage: "linear-gradient(to bottom, transparent 0%, black 30%, black 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 30%, black 100%)",
        }}
      />
    <AppShell title="Alertify">

      {/* ── Risk status card ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-strong rounded-2xl p-4"
      >
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Live Status
          </p>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Radio className="h-2.5 w-2.5 text-emergency animate-pulse" />
            Monitoring
          </div>
        </div>

        <div className="mt-1.5 flex items-center gap-2">
          <RiskDot level={m.riskLevel} />
          <h2 className={`text-xl font-semibold leading-tight ${m.riskColor}`}>
            {m.riskLabel}
          </h2>
        </div>

        <p className="mt-0.5 text-xs text-muted-foreground">
          {m.total === 0
            ? "No active alerts. Live monitoring active."
            : `${m.total} active alert${m.total !== 1 ? "s" : ""} in the system.`}
          {m.lastAlertAt && (
            <span className="ml-1 text-[10px]">
              Last: {formatDistanceToNow(m.lastAlertAt, { addSuffix: true })}
            </span>
          )}
        </p>

        {/* ── Metric grid ── */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <MetricCard
            icon={<Activity className="h-3.5 w-3.5" />}
            value={m.total}
            label="Active alerts"
            loading={loading}
          />
          <MetricCard
            icon={<AlertTriangle className="h-3.5 w-3.5 text-emergency" />}
            value={m.critical}
            label="Critical"
            loading={loading}
            highlight={m.critical > 0 ? "text-emergency" : undefined}
          />
          <MetricCard
            icon={<ShieldCheck className="h-3.5 w-3.5 text-orange-500" />}
            value={m.warning}
            label="Warnings"
            loading={loading}
            highlight={m.warning > 0 ? "text-orange-500" : undefined}
          />
        </div>
      </motion.section>

      {/* ── Recent alerts feed ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="mt-3"
      >
        <div className="mb-1.5 flex items-center justify-between px-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Recent Alerts
          </p>
          <Link
            to="/alerts"
            className="text-[11px] text-primary underline-offset-4 hover:underline"
          >
            View all
          </Link>
        </div>

        {loading ? (
          <div className="space-y-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="glass h-12 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : m.recentAlerts.length === 0 ? (
          <div className="glass rounded-xl p-4 text-center text-xs text-muted-foreground">
            No alerts right now. You're all clear.
          </div>
        ) : (
          <ul className="space-y-1.5">
            <AnimatePresence initial={false}>
              {m.recentAlerts.map((a) => (
                <motion.li
                  key={a.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  className="glass flex items-center gap-2.5 rounded-xl p-2.5"
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${SEV_BADGE[a.severity]}`}
                  >
                    <AlertTypeIcon type={a.type} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium leading-tight">
                      {a.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                      {" · "}
                      <span className="capitalize">{a.type}</span>
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-wide ${SEV_BADGE[a.severity]}`}
                  >
                    {a.severity}
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </motion.section>

      {/* ── SOS prompt ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="mt-3 mb-2 flex items-center gap-2.5 rounded-xl p-3"
        style={{
          background: "color-mix(in oklab, var(--color-card) 55%, transparent)",
          backdropFilter: "blur(32px) saturate(180%)",
          WebkitBackdropFilter: "blur(32px) saturate(180%)",
          border: "1px solid oklch(0.88 0.015 80 / 0.5)",
          boxShadow: "0 8px 32px 0 oklch(0.7 0.05 60 / 0.15)",
        }}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emergency/10 text-emergency">
          <Siren className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-foreground">
            Need urgent help?
          </p>
          <p className="text-[10px] text-muted-foreground">
            Tap the red SOS button below to broadcast your location.
          </p>
        </div>
      </motion.div>

    </AppShell>
    </div>
  );
}

// ── Metric card sub-component ────────────────────────────────────────────────
function MetricCard({
  icon,
  value,
  label,
  loading,
  highlight,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  loading: boolean;
  highlight?: string;
}) {
  return (
    <div className="rounded-xl bg-background/60 p-2.5 text-center">
      <div className="flex justify-center text-muted-foreground">{icon}</div>
      <div className="mt-0.5 text-base font-semibold">
        {loading ? (
          <span className="inline-block h-4 w-5 animate-pulse rounded bg-muted" />
        ) : (
          <Counter value={value} className={highlight} />
        )}
      </div>
      <p className="text-[9px] leading-tight text-muted-foreground">{label}</p>
    </div>
  );
}
