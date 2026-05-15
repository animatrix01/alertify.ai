import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";

export function AppShell({
  children,
  title,
  hideTopBar,
}: {
  children: ReactNode;
  title?: string;
  hideTopBar?: boolean;
}) {
  return (
    <div className="relative min-h-dvh">
      {!hideTopBar && <TopBar title={title} />}
      <main className="mx-auto max-w-md px-3 pb-28 pt-3">{children}</main>
      <BottomNav />
    </div>
  );
}
