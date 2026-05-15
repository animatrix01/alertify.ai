import { ShieldAlert, Wifi } from "lucide-react";
import { motion } from "framer-motion";

export function TopBar({ title = "Alertify" }: { title?: string }) {
  return (
    <header className="sticky top-0 z-30 px-3 pt-[max(env(safe-area-inset-top),0.25rem)]">
      <div className="glass mx-auto mt-1.5 flex max-w-md items-center justify-between rounded-xl px-3 py-2">
        <div className="flex items-center gap-2">
          <motion.div
            initial={{ rotate: -10, scale: 0.9 }}
            animate={{ rotate: 0, scale: 1 }}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-emergency/10 text-emergency"
          >
            <ShieldAlert className="h-4 w-4" />
          </motion.div>
          <div className="leading-tight">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Live
            </p>
            <h1 className="text-sm font-semibold text-foreground">{title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-success">
          <Wifi className="h-3 w-3" />
          <span className="text-[10px] font-medium">Online</span>
        </div>
      </div>
    </header>
  );
}
