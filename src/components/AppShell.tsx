import type { ReactNode } from "react";
import { useEffect } from "react";
import { BottomNav } from "./BottomNav";
import { ISTClock } from "./ISTClock";
import { startMidnightWatcher } from "@/lib/store";

export function AppShell({ title, subtitle, children, right }: { title: string; subtitle?: string; children: ReactNode; right?: ReactNode }) {
  useEffect(() => { const stop = startMidnightWatcher(); return () => { stop && stop(); }; }, []);
  return (
    <div className="min-h-screen pb-32">
      <div className="mx-auto max-w-[560px] px-5 pt-8">
        <header className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
            <p className="text-[11px] text-muted-foreground mt-2 tabular-nums"><ISTClock /></p>
          </div>
          {right}
        </header>
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
