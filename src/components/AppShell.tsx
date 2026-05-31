import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { BottomNav } from "./BottomNav";
import { ISTClock } from "./ISTClock";
import { startMidnightWatcher } from "@/lib/store";
import { nowIST } from "@/lib/ist";

export function AppShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  useEffect(() => { const stop = startMidnightWatcher(); return () => { stop && stop(); }; }, []);
  const [pretty, setPretty] = useState<{ weekday: string; rest: string }>({ weekday: "", rest: "" });
  useEffect(() => {
    const d = nowIST();
    const full = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const [weekday, ...rest] = full.split(",");
    setPretty({ weekday, rest: rest.join(",").trim() });
  }, []);

  return (
    <div className="min-h-screen pb-32 max-w-md mx-auto">
      <header className="px-6 pt-10 pb-4 animate-pop">
        <div className="flex items-start justify-between">
          <div>
            <div suppressHydrationWarning className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground font-medium">
              {pretty.weekday || "\u00a0"}
            </div>
            <h1 className="mt-2 font-display text-[52px] leading-[0.95] tracking-tight">
              {title}<span className="italic font-light text-muted-foreground">.</span>
            </h1>
            <p suppressHydrationWarning className="mt-2 text-sm text-muted-foreground">
              {subtitle ?? pretty.rest}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 tabular-nums">
              <ISTClock />
            </p>
          </div>
          <div className="h-12 w-12 rounded-full bg-foreground text-background flex items-center justify-center font-display text-xl shrink-0 shadow-sm animate-pop">
            d
          </div>
        </div>
      </header>
      <main className="px-5">{children}</main>
      <BottomNav />
    </div>
  );
}
