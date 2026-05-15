import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Phone, Edit2, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";

export function ProfileSection() {
  const { user } = useAuth();
  const { profile, loading, saving, updateProfile } = useProfile();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // Sync form when profile loads
  useEffect(() => {
    if (profile) {
      setName(profile.display_name ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  const save = async () => {
    const { error } = await updateProfile({ display_name: name.trim() || null, phone: phone.trim() || null });
    if (error) { toast.error(error.message); return; }
    toast.success("Profile updated");
    setEditing(false);
  };

  const cancel = () => {
    setName(profile?.display_name ?? "");
    setPhone(profile?.phone ?? "");
    setEditing(false);
  };

  if (!user) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong rounded-2xl p-5 space-y-4"
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-emergency" />
          <h2 className="font-semibold">Profile</h2>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Edit2 className="h-3.5 w-3.5" /> Edit
          </button>
        )}
      </header>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : editing ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">Full name</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-phone">Phone number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button className="flex-1" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Save
            </Button>
            <Button variant="outline" className="flex-1" onClick={cancel} disabled={saving}>
              <X className="mr-2 h-4 w-4" /> Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <ProfileRow
            icon={<User className="h-4 w-4" />}
            label="Name"
            value={profile?.display_name ?? user.email?.split("@")[0] ?? "—"}
          />
          <ProfileRow
            icon={<Phone className="h-4 w-4" />}
            label="Phone"
            value={profile?.phone ?? "Not set"}
          />
          <ProfileRow
            icon={<span className="text-xs font-mono">@</span>}
            label="Email"
            value={user.email ?? "—"}
          />
        </div>
      )}
    </motion.section>
  );
}

function ProfileRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-background/50 px-3 py-2.5">
      <span className="text-muted-foreground w-4 flex justify-center">{icon}</span>
      <span className="text-xs text-muted-foreground w-12 shrink-0">{label}</span>
      <span className="text-sm font-medium truncate">{value}</span>
    </div>
  );
}
