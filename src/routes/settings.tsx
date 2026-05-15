import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  Bell,
  LogIn,
  LogOut,
  MapPin,
  Send,
  ShieldAlert,
  User as UserIcon,
  Volume2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { requestNotificationPermission } from "@/services/notifications/permission";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { EmergencyContactsSection } from "@/components/settings/EmergencyContactsSection";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings · Alertify" },
      {
        name: "description",
        content: "Account, notification preferences and emergency contacts.",
      },
    ],
  }),
  component: SettingsPage,
});

import { DEFAULT_PREFS, type Preferences, type Severity } from "@/hooks/use-preferences";
import type { TablesInsert } from "@/integrations/supabase/types";

type Prefs = Preferences;

const DEFAULTS: Prefs = DEFAULT_PREFS;

function SettingsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [testAlertBusy, setTestAlertBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFetching(true);
    supabase
      .from("user_preferences")
      .select("alert_radius_km,push_enabled,sound_enabled,share_location,min_severity")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        setPrefs(
          data
            ? {
                alert_radius_km: Number(data.alert_radius_km),
                push_enabled: data.push_enabled,
                sound_enabled: data.sound_enabled,
                share_location: data.share_location,
                min_severity: data.min_severity as Severity,
              }
            : DEFAULTS,
        );
        setFetching(false);
      });
  }, [user]);

  const update = <K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs((p) => (p ? { ...p, [key]: value } : p));
  };

  const save = async () => {
    if (!user || !prefs) return;
    setSaving(true);
    const { error } = await supabase
      .from("user_preferences")
      .upsert({ user_id: user.id, ...prefs }, { onConflict: "user_id" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Preferences saved");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth" });
  };

  const sendTestDisasterAlert = async () => {
    if (!user || !prefs) return;
    if (!prefs.push_enabled) {
      toast.error("Turn on Push notifications, then save preferences, before testing.");
      return;
    }
    if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
      const perm = await requestNotificationPermission();
      if (perm !== "granted") {
        toast.error("Allow browser notifications to see the test alert.");
        return;
      }
    }
    setTestAlertBusy(true);
    const row: TablesInsert<"disaster_alerts"> = {
      title: "Test disaster alert",
      description: "Manual test from Alertify settings.",
      type: "flood",
      severity: "warning",
      latitude: 19.076,
      longitude: 72.8777,
      radius_km: 10,
    };
    const { error } = await supabase.from("disaster_alerts").insert(row);
    setTestAlertBusy(false);
    if (error) {
      const msg = error.message;
      if (msg.includes("column") || msg.includes("schema cache")) {
        toast.error(
          "Your disaster_alerts table is missing columns or permissions. Run supabase/sql_editor_test_notification.sql in the Supabase SQL Editor (set your user UUID in that file), then try again.",
          { duration: 14_000 },
        );
        return;
      }
      toast.error(msg);
      return;
    }
    toast.success("Test row inserted — watch for a system notification.");
  };

  return (
    <AppShell title="Settings">
      <div className="space-y-4">
        <div className="glass-strong rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emergency/10 text-emergency">
              <UserIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Signed in as</p>
              <p className="truncate font-medium">
                {loading ? "…" : (user?.email ?? "Not signed in")}
              </p>
            </div>
          </div>
          <div className="mt-4">
            {user ? (
              <Button variant="outline" className="w-full" onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </Button>
            ) : (
              <Button asChild className="w-full">
                <Link to="/auth">
                  <LogIn className="mr-2 h-4 w-4" /> Sign in
                </Link>
              </Button>
            )}
          </div>
        </div>

        <ProfileSection />
        <EmergencyContactsSection />

        {!user ? (
          <div className="glass rounded-2xl p-5 text-sm text-muted-foreground">
            Sign in to manage notification preferences.
          </div>
        ) : fetching || !prefs ? (          <div className="glass rounded-2xl p-8 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <section className="glass-strong rounded-2xl p-5 space-y-5">
              <header className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emergency" />
                <h2 className="font-semibold">Alert radius</h2>
              </header>
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <Label className="text-sm text-muted-foreground">Notify me within</Label>
                  <span className="text-2xl font-bold tabular-nums">
                    {prefs.alert_radius_km}
                    <span className="text-sm font-normal text-muted-foreground ml-1">km</span>
                  </span>
                </div>
                <Slider
                  min={1}
                  max={200}
                  step={1}
                  value={[prefs.alert_radius_km]}
                  onValueChange={(v) => update("alert_radius_km", v[0])}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 km</span>
                  <span>200 km</span>
                </div>
              </div>
            </section>

            <section className="glass-strong rounded-2xl p-5 space-y-4">
              <header className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-emergency" />
                <h2 className="font-semibold">Minimum severity</h2>
              </header>
              <Select
                value={prefs.min_severity}
                onValueChange={(v) => update("min_severity", v as Severity)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info — all alerts</SelectItem>
                  <SelectItem value="advisory">Advisory & above</SelectItem>
                  <SelectItem value="warning">Warning & above</SelectItem>
                  <SelectItem value="critical">Critical only</SelectItem>
                </SelectContent>
              </Select>
            </section>

            <section className="glass-strong rounded-2xl p-5 space-y-4">
              <header className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-emergency" />
                <h2 className="font-semibold">Notifications</h2>
              </header>
              <ToggleRow
                icon={<Bell className="h-4 w-4" />}
                label="Push notifications"
                description="Browser alerts for new disasters (respects minimum severity below)"
                checked={prefs.push_enabled}
                onChange={async (v) => {
                  if (v) {
                    const perm = await requestNotificationPermission();
                    if (perm !== "granted") {
                      toast.error(
                        perm === "denied"
                          ? "Notifications are blocked. Allow them in your browser site settings."
                          : perm === "unsupported"
                            ? "This browser does not support notifications."
                            : "Notification permission was not granted.",
                      );
                      return;
                    }
                  }
                  update("push_enabled", v);
                }}
              />
              <ToggleRow
                icon={<Volume2 className="h-4 w-4" />}
                label="Sound"
                description="Play an alert sound for critical events"
                checked={prefs.sound_enabled}
                onChange={(v) => update("sound_enabled", v)}
              />
              <ToggleRow
                icon={<MapPin className="h-4 w-4" />}
                label="Share location"
                description="Use your location to filter nearby alerts"
                checked={prefs.share_location}
                onChange={(v) => update("share_location", v)}
              />
              <div className="rounded-xl border border-border/80 bg-background/40 p-3 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Inserts one sample row into{" "}
                  <code className="text-foreground">disaster_alerts</code> (needs Realtime on that
                  table). If you get a missing-column or permission error, run{" "}
                  <code className="text-foreground">supabase/sql_editor_test_notification.sql</code>{" "}
                  in the Supabase SQL Editor first (set your user UUID in that file). Save
                  preferences if you just enabled push.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  disabled={testAlertBusy}
                  onClick={sendTestDisasterAlert}
                >
                  {testAlertBusy ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Send test disaster alert
                </Button>
              </div>
            </section>

            <Button className="w-full h-12 text-base" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save preferences
            </Button>
          </>
        )}
      </div>
    </AppShell>
  );
}

function ToggleRow({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void | Promise<void>;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 text-muted-foreground">{icon}</div>
        <div className="min-w-0">
          <Label className="font-medium">{label}</Label>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
