import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Mail, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { formatAuthError } from "@/lib/auth-errors";

const googleAuthEnabled =
  import.meta.env.VITE_ENABLE_GOOGLE_AUTH !== "false" &&
  import.meta.env.VITE_ENABLE_GOOGLE_AUTH !== "0";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · Alertify" },
      { name: "description", content: "Sign in to receive live disaster alerts and send SOS." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Only auto-redirect if user is logged in AND not on the auth page intentionally
    // Don't redirect during staff login flow
    if (!loading && user && !busy) navigate({ to: "/" });
  }, [user, loading, navigate, busy]);

  const staffLogin = async () => {
    setBusy(true);
    try {
      // Sign out any existing session first
      await supabase.auth.signOut();
      const { error } = await supabase.auth.signInWithPassword({
        email: "divyansh.alertify@gmail.com",
        password: "divyansh1234",
      });
      if (error) throw error;
      toast.success("Signed in as responder.");
      setTimeout(() => navigate({ to: "/responder" }), 400);
    } catch (err) {
      toast.error("Staff login failed. Check Supabase Auth for divyansh.alertify@gmail.com.");
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Check your email to verify your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back.");
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.assign(data.url);
        return;
      }
      toast.error(
        "Could not start Google sign-in. Check Supabase Auth → Providers → Google, or use email and password.",
      );
    } catch (err) {
      toast.error(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-dvh flex items-center justify-center px-4 py-6">
      <div
        className="absolute inset-0 -z-10 opacity-60"
        style={{
          background: "radial-gradient(60% 50% at 50% 0%, oklch(0.95 0.04 60) 0%, transparent 70%)",
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong w-full max-w-md rounded-2xl p-5"
      >
        <Link to="/" className="flex items-center gap-2 mb-4">
          <ShieldAlert className="h-5 w-5 text-emergency" />
          <span className="text-base font-semibold tracking-tight">Alertify</span>
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {mode === "signin"
            ? "Sign in to access live alerts and SOS."
            : "Get personalized disaster alerts in your area."}
        </p>

        {googleAuthEnabled ? (
          <>
            <Button
              type="button"
              variant="outline"
              className="mt-4 w-full h-9 text-sm"
              onClick={google}
              disabled={busy}
            >
              <svg viewBox="0 0 24 24" className="mr-2 h-3.5 w-3.5">
                <path
                  fill="#EA4335"
                  d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4-5.5 4a6.1 6.1 0 1 1 0-12.2c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.1 14.7 2 12 2a10 10 0 1 0 0 20c5.8 0 9.6-4 9.6-9.7 0-.7-.1-1.2-.2-1.8H12z"
                />
              </svg>
              Continue with Google
            </Button>

            <div className="my-3 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
            </div>
          </>
        ) : null}

        <form onSubmit={submit} className={`space-y-2.5 ${googleAuthEnabled ? "" : "mt-4"}`}>
          {mode === "signup" && (
            <div className="space-y-1">
              <Label htmlFor="name" className="text-xs">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="h-9 text-sm"
              />
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="email" className="text-xs">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 h-9 text-sm"
                placeholder="you@example.com"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="password" className="text-xs">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 h-9 text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>
          <Button type="submit" className="w-full h-9 text-sm" disabled={busy}>
            {busy && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            {mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          {mode === "signin" ? "New to Alertify?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="font-medium text-foreground underline-offset-4 hover:underline"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Create account" : "Sign in"}
          </button>
        </p>

        {/* Staff login */}
        <div className="mt-3 border-t border-border/60 pt-3">
          <button
            type="button"
            disabled={busy}
            onClick={staffLogin}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-emergency/30 bg-emergency/5 py-2 text-xs font-medium text-emergency hover:bg-emergency/10 transition-colors disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldAlert className="h-3.5 w-3.5" />}
            Login as Staff / Responder
          </button>
        </div>
      </motion.div>
    </div>
  );
}
