import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type EmergencyContact = Tables<"emergency_contacts">;

export function useEmergencyContacts() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("emergency_contacts")
      .select("*")
      .eq("user_id", user.id)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });
    setContacts(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) {
      setContacts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const addContact = async (fields: Omit<TablesInsert<"emergency_contacts">, "user_id">) => {
    if (!user) return { error: new Error("Not signed in") };
    const { error } = await supabase
      .from("emergency_contacts")
      .insert({ ...fields, user_id: user.id });
    if (!error) await fetch();
    return { error };
  };

  const updateContact = async (id: string, fields: TablesUpdate<"emergency_contacts">) => {
    const { error } = await supabase
      .from("emergency_contacts")
      .update(fields)
      .eq("id", id);
    if (!error) await fetch();
    return { error };
  };

  const deleteContact = async (id: string) => {
    const { error } = await supabase
      .from("emergency_contacts")
      .delete()
      .eq("id", id);
    if (!error) setContacts((prev) => prev.filter((c) => c.id !== id));
    return { error };
  };

  const setPrimary = async (id: string) => {
    if (!user) return;
    // Clear all primaries first, then set the chosen one
    await supabase
      .from("emergency_contacts")
      .update({ is_primary: false })
      .eq("user_id", user.id);
    await supabase
      .from("emergency_contacts")
      .update({ is_primary: true })
      .eq("id", id);
    await fetch();
  };

  return { contacts, loading, addContact, updateContact, deleteContact, setPrimary };
}
