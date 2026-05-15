import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, AlertTriangle, CheckCircle2, Clock, Eye,
  Loader2, LogOut, MapPin, Radio, RefreshCw,
  ShieldAlert, Siren, Users, Sparkles, FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useStaffRole } from "@/hooks/use-staff-role";
import { useSosReports, type SosReport, type SosStatus } from "@/hooks/use-sos-reports";
import { useDisasterAlerts } from "@/hooks/use-disaster-alerts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/responder")({
  head: () => ({
    meta: [
      { title: "Responder Dashboard · Alertify" },
      { name: "description", content: "Emergency responder operations dashboard." },
    ],
  }),
  component: ResponderPage,
});

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<SosStatus, { label: string; color: string; bg: string }> = {
  active:       { label: "Active",        color: "text-emergency",   bg: "bg-emergency/10 border-emergency/30" },
  acknowledged: { label: "Reviewing",     color: "text-orange-500",  bg: "bg-orange-500/10 border-orange-500/30" },
  resolved:     { label: "Resolved",      color: "text-success",     bg: "bg-success/10 border-success/30" },
  cancelled:    { label: "Cancelled",     color: "text-muted-foreground", bg: "bg-muted/30 border-border" },
};

const SEV_COLOR: Record<string, string> = {
  critical: "text-emergency bg-emergency/10 border-emergency/30",
  warning:  "text-orange-500 bg-orange-500/10 border-orange-500/30",
  advisory: "text-amber-600 bg-amber-500/10 border-amber-500/30",
  info:     "text-sky-600 bg-sky-500/10 border-sky-500/30",
};

// ── Guard: redirect non-staff ─────────────────────────────────────────────────
function ResponderPage() {
  const { user, loading: authLoading } = useAuth();
  const { isStaff, loading: roleLoading } = useStaffRole();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait until BOTH auth and role are fully loaded before making any decision
    if (authLoading || roleLoading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    if (!isStaff) { navigate({ to: "/" }); toast.error("Access denied."); }
  }, [user, isStaff, authLoading, roleLoading, navigate]);

  // Show spinner while loading — never redirect prematurely
  if (authLoading || roleLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emergency" />
          <p className="text-sm text-muted-foreground">Verifying access…</p>
        </div>
      </div>
    );
  }
  if (!user || !isStaff) return null;
  return <Dashboard />;
}

// ── Main dashboard ────────────────────────────────────────────────────────────
function Dashboard() {
  const { reports, loading, updateStatus } = useSosReports();
  const { alerts } = useDisasterAlerts();
  const [selected, setSelected] = useState<SosReport | null>(null);

  const active   = reports.filter((r) => r.status === "active");
  const reviewing = reports.filter((r) => r.status === "acknowledged");
  const resolved = reports.filter((r) => r.status === "resolved");
  const critical = reports.filter((r) => r.severity === "critical" && r.status === "active");

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  return (
    <div className="min-h-dvh bg-background">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emergency/10 text-emergency">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Alertify</p>
              <h1 className="text-sm font-semibold leading-tight">Responder Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
              </span>
              Live
            </span>
            <Button variant="outline" size="sm" onClick={signOut} className="h-8 text-xs">
              <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-4 space-y-4">

        {/* ── Stat counters ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={<Siren className="h-4 w-4 text-emergency" />} label="Active SOS" value={active.length} urgent={active.length > 0} />
          <StatCard icon={<AlertTriangle className="h-4 w-4 text-emergency" />} label="Critical" value={critical.length} urgent={critical.length > 0} />
          <StatCard icon={<Eye className="h-4 w-4 text-orange-500" />} label="Reviewing" value={reviewing.length} />
          <StatCard icon={<CheckCircle2 className="h-4 w-4 text-success" />} label="Resolved" value={resolved.length} />
        </div>

        {/* ── Active disaster alerts strip ── */}
        {alerts.length > 0 && (
          <div className="glass rounded-2xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <Radio className="h-3.5 w-3.5 text-emergency animate-pulse" />
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Active Disaster Alerts ({alerts.length})
              </p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {alerts.slice(0, 6).map((a) => (
                <div key={a.id} className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs font-medium ${SEV_COLOR[a.severity]}`}>
                  {a.type.toUpperCase()} · {a.title.slice(0, 30)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SOS feed + detail panel ── */}
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">

          {/* Feed */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                SOS Reports · {reports.length} total
              </p>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[0,1,2].map((i) => <div key={i} className="glass h-28 animate-pulse rounded-2xl" />)}
              </div>
            ) : reports.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
                No SOS reports yet. System is monitoring.
              </div>
            ) : (
              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {reports.map((r) => (
                    <SosCard
                      key={r.id}
                      report={r}
                      selected={selected?.id === r.id}
                      onSelect={() => setSelected(selected?.id === r.id ? null : r)}
                      onStatusChange={async (status) => {
                        const { error } = await updateStatus(r.id, status);
                        if (error) toast.error(error.message);
                        else toast.success(`Status → ${STATUS_CONFIG[status].label}`);
                      }}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>

          {/* Detail panel */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            {selected ? (
              <DetailPanel
                report={selected}
                onClose={() => setSelected(null)}
                onStatusChange={async (status, notes) => {
                  const { error } = await updateStatus(selected.id, status, notes);
                  if (error) toast.error(error.message);
                  else {
                    toast.success(`Status → ${STATUS_CONFIG[status].label}`);
                    setSelected(null);
                  }
                }}
              />
            ) : (
              <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
                <FileText className="mx-auto h-8 w-8 mb-2 opacity-30" />
                Select an SOS report to view details and manage response.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, urgent }: {
  icon: React.ReactNode; label: string; value: number; urgent?: boolean;
}) {
  return (
    <div className={`glass rounded-2xl p-4 ${urgent ? "border-emergency/40" : ""}`}>
      <div className="flex items-center justify-between mb-1">
        {icon}
        {urgent && value > 0 && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emergency opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emergency" />
          </span>
        )}
      </div>
      <p className={`text-2xl font-bold tabular-nums ${urgent && value > 0 ? "text-emergency" : "text-foreground"}`}>
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

// ── SOS card ──────────────────────────────────────────────────────────────────
function SosCard({ report: r, selected, onSelect, onStatusChange }: {
  report: SosReport;
  selected: boolean;
  onSelect: () => void;
  onStatusChange: (s: SosStatus) => void;
}) {
  const cfg = STATUS_CONFIG[r.status as SosStatus];
  const isActive = r.status === "active";

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={`glass rounded-2xl p-4 cursor-pointer transition-all ${selected ? "ring-2 ring-primary" : ""} ${isActive ? "border-emergency/30" : ""}`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${SEV_COLOR[r.severity]}`}>
            <Siren className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold uppercase ${SEV_COLOR[r.severity].split(" ")[0]}`}>
                {r.severity}
              </span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.bg} ${cfg.color}`}>
                {cfg.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 truncate max-w-[200px]">
              {r.message ?? "No message provided"}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[11px] text-muted-foreground">
            {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
          </p>
          {r.latitude && r.longitude && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {r.latitude.toFixed(3)}, {r.longitude.toFixed(3)}
            </p>
          )}
        </div>
      </div>

      {/* Quick action buttons */}
      {isActive && (
        <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onStatusChange("acknowledged")}
            className="flex-1 rounded-xl bg-orange-500/10 text-orange-600 border border-orange-500/30 py-1.5 text-xs font-medium hover:bg-orange-500/20 transition-colors"
          >
            Reviewing
          </button>
          <button
            onClick={() => onStatusChange("resolved")}
            className="flex-1 rounded-xl bg-success/10 text-success border border-success/30 py-1.5 text-xs font-medium hover:bg-success/20 transition-colors"
          >
            Resolved
          </button>
        </div>
      )}
    </motion.li>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────
function DetailPanel({ report: r, onClose, onStatusChange }: {
  report: SosReport;
  onClose: () => void;
  onStatusChange: (s: SosStatus, notes?: string) => void;
}) {
  const [notes, setNotes] = useState(r.responder_notes ?? "");
  const [busy, setBusy] = useState(false);
  const cfg = STATUS_CONFIG[r.status as SosStatus];

  const handle = async (status: SosStatus) => {
    setBusy(true);
    await onStatusChange(status, notes || undefined);
    setBusy(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass-strong rounded-2xl p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm">SOS Detail</h2>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs">✕ Close</button>
      </div>

      {/* Status */}
      <div className={`rounded-xl border px-3 py-2 flex items-center gap-2 ${cfg.bg}`}>
        <Activity className={`h-4 w-4 ${cfg.color}`} />
        <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
      </div>

      {/* Info rows */}
      <div className="space-y-2 text-sm">
        <InfoRow label="Severity" value={r.severity.toUpperCase()} highlight={SEV_COLOR[r.severity].split(" ")[0]} />
        <InfoRow label="Reported" value={formatDistanceToNow(new Date(r.created_at), { addSuffix: true })} />
        {r.message && <InfoRow label="Message" value={r.message} />}
        {r.latitude && r.longitude && (
          <div className="flex items-start gap-2 rounded-xl bg-background/50 px-3 py-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="font-medium">{r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}</p>
              <a
                href={`https://maps.google.com/?q=${r.latitude},${r.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                Open in Maps ↗
              </a>
            </div>
          </div>
        )}
        {r.image_url && (
          <div className="rounded-xl overflow-hidden">
            <img src={r.image_url} alt="SOS photo" className="w-full max-h-48 object-cover" />
          </div>
        )}
        {r.ai_summary && (
          <div className="flex items-start gap-2 rounded-xl bg-primary/5 border border-primary/20 px-3 py-2">
            <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">AI Summary</p>
              <p className="text-sm">{r.ai_summary}</p>
            </div>
          </div>
        )}
      </div>

      {/* Responder notes */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Responder Notes</label>
        <Textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes for this case…"
          className="text-sm"
        />
      </div>

      {/* Status actions */}
      {r.status !== "resolved" && r.status !== "cancelled" && (
        <div className="grid grid-cols-2 gap-2">
          {r.status === "active" && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => handle("acknowledged")}
              className="border-orange-500/30 text-orange-600 hover:bg-orange-500/10"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5 mr-1" />}
              Reviewing
            </Button>
          )}
          <Button
            size="sm"
            disabled={busy}
            onClick={() => handle("resolved")}
            className="bg-success text-success-foreground hover:bg-success/90 col-span-1"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
            Resolved
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => handle("cancelled")}
            className="col-span-1 text-muted-foreground"
          >
            Cancel
          </Button>
        </div>
      )}
    </motion.div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-background/50 px-3 py-2">
      <span className="text-xs text-muted-foreground w-16 shrink-0 mt-0.5">{label}</span>
      <span className={`text-sm font-medium ${highlight ?? ""}`}>{value}</span>
    </div>
  );
}
