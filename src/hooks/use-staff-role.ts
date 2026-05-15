import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type UserRole = "user" | "responder" | "admin";

// Staff emails — hardcoded for hackathon demo
// These users always get responder access regardless of DB role
const STAFF_EMAILS = ["divyansh.alertify@gmail.com"];

/**
 * Determines if the current user is staff.
 * Primary check: email is in STAFF_EMAILS list (instant, no DB query needed).
 * Secondary check: profiles.role = 'responder' | 'admin' (for future use).
 */
export function useStaffRole() {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<UserRole>("user");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setRole("user");
      setLoading(false);
      return;
    }

    // Fast path: check email list first — no DB query, no RLS issues
    if (user.email && STAFF_EMAILS.includes(user.email.toLowerCase())) {
      setRole("responder");
      setLoading(false);
      return;
    }

    // Fallback: check DB role
    let active = true;
    setLoading(true);
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setRole((data?.role as UserRole) ?? "user");
        setLoading(false);
      });
    return () => { active = false; };
  }, [user, authLoading]);

  const isStaff = role === "responder" || role === "admin";
  return { role, isStaff, loading: authLoading || loading };
}
