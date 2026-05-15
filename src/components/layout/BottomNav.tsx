import { Link, useLocation } from "@tanstack/react-router";
import { Home, Map, Siren, Bell, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useDisasterAlerts } from "@/hooks/use-disaster-alerts";

type NavItem = {
  to: "/" | "/map" | "/sos" | "/alerts" | "/settings";
  label: string;
  icon: typeof Home;
  accent?: boolean;
};

const items: NavItem[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/map", label: "Map", icon: Map },
  { to: "/sos", label: "SOS", icon: Siren, accent: true },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const { pathname } = useLocation();
  const { alerts } = useDisasterAlerts();
  const alertCount = alerts.length;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2"
      style={{ background: "transparent" }}
      aria-label="Primary"
    >
      <div
        className="mx-auto flex max-w-md items-end justify-between rounded-3xl px-2 py-2"
        style={{
          background: "oklch(0.99 0.005 85 / 0.45)",
          backdropFilter: "blur(28px) saturate(200%)",
          WebkitBackdropFilter: "blur(28px) saturate(200%)",
          border: "1px solid oklch(0.88 0.015 80 / 0.35)",
          boxShadow: "0 -2px 24px 0 oklch(0.5 0.02 60 / 0.08), 0 8px 32px 0 oklch(0.7 0.05 60 / 0.12)",
        }}
      >
        {items.map(({ to, label, icon: Icon, accent }) => {
          const active = pathname === to;
          if (accent) {
            return (
              <Link
                key={to}
                to={to}
                className="relative -mt-7 flex flex-col items-center"
                aria-label={label}
              >
                <motion.div
                  whileTap={{ scale: 0.92 }}
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-full bg-emergency text-emergency-foreground shadow-[var(--shadow-emergency)]",
                    "pulse-emergency",
                  )}
                >
                  <Icon className="h-6 w-6" />
                </motion.div>
                <span className="mt-1 text-[10px] font-semibold tracking-wide text-emergency">
                  {label}
                </span>
              </Link>
            );
          }

          const showBadge = to === "/alerts" && alertCount > 0;

          return (
            <Link
              key={to}
              to={to}
              className="relative flex w-14 flex-col items-center gap-1 py-1.5"
              aria-label={label}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "h-5 w-5 transition-colors",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                />
                {showBadge && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emergency px-1 text-[9px] font-bold text-emergency-foreground"
                  >
                    {alertCount > 99 ? "99+" : alertCount}
                  </motion.span>
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] transition-colors",
                  active ? "font-semibold text-primary" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
              {active && (
                <motion.span
                  layoutId="bottom-nav-active"
                  className="absolute -top-0.5 h-1 w-8 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
