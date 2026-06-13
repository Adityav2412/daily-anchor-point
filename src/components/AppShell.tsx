import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { BottomNav } from "./BottomNav";
import { startMidnightWatcher } from "@/lib/store";
import { recomputeGarden } from "@/lib/garden";
import { nowIST } from "@/lib/ist";
import { useTheme } from "@/hooks/use-theme";
import { Moon, Leaf, WifiOff } from "lucide-react";

export function AppShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  useEffect(() => {
    const stop = startMidnightWatcher();
    recomputeGarden();
    return () => { stop && stop(); };
  }, []);
  const [pretty, setPretty] = useState<{ weekday: string; rest: string }>({ weekday: "", rest: "" });
  const [alertMsg, setAlertMsg] = useState<{ title: string; body?: string } | null>(null);
  const [online, setOnline] = useState(true);
  const { theme, toggle } = useTheme();
  useEffect(() => {
    const d = nowIST();
    const full = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const [weekday, ...rest] = full.split(",");
    setPretty({ weekday, rest: rest.join(",").trim() });
    if (typeof navigator !== "undefined") setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ title: string; body?: string }>;
      setAlertMsg(ce.detail);
      setTimeout(() => setAlertMsg(null), 8000);
    };
    window.addEventListener("daily:in-app-alert", handler);
    return () => window.removeEventListener("daily:in-app-alert", handler);
  }, []);

  return (
    <div className="min-h-screen pb-28 max-w-md mx-auto">
      <header className="px-6 pt-8 pb-3 animate-pop">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <div suppressHydrationWarning className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium">
              {pretty.weekday || "\u00a0"}
            </div>
            <h1 className="mt-1.5 font-display text-[40px] leading-[1] tracking-tight">
              {title}
            </h1>
            <p suppressHydrationWarning className="mt-1.5 text-[13px] text-muted-foreground">
              {subtitle ?? pretty.rest}
            </p>
            {!online && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber/15 text-foreground/75 px-2.5 py-1 text-[10px] font-medium">
                <WifiOff size={11} /> Offline mode active
              </div>
            )}
          </div>
          <button
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="h-10 w-10 rounded-full bg-card text-foreground flex items-center justify-center shrink-0 shadow-[var(--card-shadow)] press transition"
          >
            {theme === "dark" ? <Moon size={16} /> : <Leaf size={16} />}
          </button>
        </div>
      </header>
      <main className="px-5">{children}</main>
      {alertMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-[92%] w-md card-sage rounded-2xl px-4 py-3 shadow-lg animate-fade-up">
          <div className="font-display text-sm">{alertMsg.title}</div>
          {alertMsg.body && <div className="text-xs text-foreground/70 mt-0.5">{alertMsg.body}</div>}
        </div>
      )}
      <BottomNav />
    </div>
  );
}
