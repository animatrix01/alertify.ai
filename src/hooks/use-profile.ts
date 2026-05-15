import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setProfile(data ?? null);
        setLoading(false);
      });
    return () => { active = false; };
  }, [user]);

  const updateProfile = async (fields: TablesUpdate<"profiles">) => {
    if (!user) return { error: new Error("Not signed in") };
    setSaving(true);
    const { data, error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, ...fields }, { onConflict: "id" })
      .select()
      .single();
    setSaving(false);
    if (!error && data) setProfile(data);
    return { error };
  };

  return { profile, loading, saving, updateProfile };
}
