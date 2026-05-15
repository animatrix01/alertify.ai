import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Siren, MapPin, Camera, Loader2, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useGeolocation } from "@/hooks/use-geolocation";
import { toast } from "sonner";
import { playSOSSound } from "@/services/notifications/sound";
import type { Database } from "@/integrations/supabase/types";

type Sev = Database["public"]["Enums"]["alert_severity"];

export const Route = createFileRoute("/sos")({
  head: () => ({
    meta: [
      { title: "SOS · Alertify" },
      { name: "description", content: "Send an emergency SOS with your live location and photo." },
    ],
  }),
  component: SOSPage,
});

function SOSPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const geo = useGeolocation();
  const coords = geo.status === "ok" ? { latitude: geo.lat, longitude: geo.lng } : null;
  const [severity, setSeverity] = useState<Sev>("critical");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const onFile = (f: File | null) => {
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const send = async () => {
    if (loading) return;
    if (!user) {
      toast.info("Please sign in to send an SOS.");
      navigate({ to: "/auth" });
      return;
    }
    // Play sound immediately on tap — before any async work
    void playSOSSound();
    setBusy(true);
    try {
      let image_url: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("sos-images")
          .upload(path, file, { upsert: false, contentType: file.type });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("sos-images").getPublicUrl(path);
        image_url = data.publicUrl;
      }
      const { error } = await supabase.from("sos_reports").insert({
        user_id: user.id,
        severity,
        message: message || null,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        image_url,
      });
      if (error) throw error;
      setDone(true);
      toast.success("SOS sent. Help is on the way.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send SOS");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Emergency SOS">
      <div className="space-y-2.5">
        <motion.button
          type="button"
          onClick={send}
          disabled={busy || done}
          whileTap={{ scale: 0.96 }}
          className="glass-strong relative w-full rounded-2xl p-5 flex flex-col items-center gap-2"
        >
          <div className={`flex h-20 w-20 items-center justify-center rounded-full bg-emergency text-emergency-foreground ${!done && !busy ? "pulse-emergency" : ""}`}>
            {done ? <CheckCircle2 className="h-9 w-9" />
              : busy ? <Loader2 className="h-8 w-8 animate-spin" />
              : <Siren className="h-9 w-9" />}
          </div>
          <h2 className="text-base font-semibold">
            {done ? "SOS sent" : busy ? "Sending…" : "Send SOS now"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {done ? "Responders have been notified."
              : "Tap to broadcast your live location to responders."}
          </p>
        </motion.button>

        <div className="glass rounded-xl p-2.5 flex items-center gap-2 text-xs">
          <MapPin className="h-3.5 w-3.5 text-emergency shrink-0" />
          {coords ? (
            <span className="text-muted-foreground">
              {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
            </span>
          ) : (
            <span className="text-muted-foreground">Locating you…</span>
          )}
        </div>

        <div className="glass rounded-xl p-3 space-y-2.5">
          <div className="space-y-1">
            <Label className="text-xs">Severity</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as Sev)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="critical">Critical — life-threatening</SelectItem>
                <SelectItem value="warning">Warning — urgent</SelectItem>
                <SelectItem value="advisory">Advisory — caution</SelectItem>
                <SelectItem value="info">Info — observation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="msg" className="text-xs">What's happening?</Label>
            <Textarea
              id="msg"
              rows={2}
              placeholder="Describe the situation…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Photo (optional)</Label>
            <label className="flex items-center gap-2 rounded-lg border border-dashed border-border p-2.5 cursor-pointer hover:bg-accent/40 transition">
              <Camera className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground flex-1 truncate">
                {file ? file.name : "Tap to attach a photo"}
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {preview && (
              <img src={preview} alt="preview" className="mt-1.5 max-h-36 w-full rounded-lg object-cover" />
            )}
          </div>
        </div>

        {!user && !loading && (
          <Button variant="outline" className="w-full h-9 text-xs" onClick={() => navigate({ to: "/auth" })}>
            Sign in to send SOS
          </Button>
        )}
      </div>
    </AppShell>
  );
}
