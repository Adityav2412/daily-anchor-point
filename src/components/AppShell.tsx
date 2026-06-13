import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { BottomNav } from "./BottomNav";
import { actions, startMidnightWatcher, useStore } from "@/lib/store";
import { recomputeGarden } from "@/lib/garden";
import { nowIST } from "@/lib/ist";
import { useTheme } from "@/hooks/use-theme";
import { Moon, Leaf, WifiOff, Bell, X, Settings as SettingsIcon } from "lucide-react";
import { SettingsModal } from "./SettingsModal";

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const m = Math.round(diffMs / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export function AppShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  useEffect(() => {
    const stop = startMidnightWatcher();
    recomputeGarden();
    return () => { stop && stop(); };
  }, []);
  const [pretty, setPretty] = useState<{ weekday: string; rest: string }>({ weekday: "", rest: "" });
  const [alertMsg, setAlertMsg] = useState<{ title: string; body?: string } | null>(null);
  const [online, setOnline] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const missed = useStore((s) => s.missedReminders ?? []);
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
    <div className="min-h-screen pb-32 max-w-md mx-auto">
      <header className="px-6 pt-10 pb-5 animate-pop">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div suppressHydrationWarning className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground font-medium">
              {pretty.weekday || "\u00a0"}
            </div>
            <h1 className="mt-3 font-display text-[52px] leading-[0.95] tracking-tight">
              {title}
            </h1>
            <p suppressHydrationWarning className="mt-2.5 text-[16px] text-muted-foreground">
              {subtitle ?? pretty.rest}
            </p>
            {!online && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber/15 text-foreground/75 px-3 py-1.5 text-[11px] font-medium">
                <WifiOff size={12} /> Offline mode active
              </div>
            )}
          </div>
          <button
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="h-12 w-12 rounded-full bg-card text-foreground flex items-center justify-center shrink-0 shadow-[var(--card-shadow)] press transition"
          >
            {theme === "dark" ? <Moon size={18} /> : <Leaf size={18} />}
          </button>
        </div>
      </header>
      <main className="px-5 animate-page-in">
        {missed.length > 0 && (
          <div className="mb-4 space-y-2 animate-fade-up">
            {missed.slice(0, 3).map((m) => (
              <div key={m.id} className="card-peach rounded-2xl px-4 py-3 flex items-start gap-3">
                <Bell size={16} className="mt-1 shrink-0 opacity-70" />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-foreground/60 font-medium">Missed Reminder</div>
                  <div className="font-display text-[17px] leading-tight mt-0.5 truncate">{m.title.replace(/^(Reminder: |📅 )/, "")}</div>
                  <div className="text-xs text-foreground/60 mt-0.5">{relativeTime(m.scheduledAt)}</div>
                </div>
                <button
                  onClick={() => actions.dismissMissedReminder(m.id)}
                  aria-label="Dismiss"
                  className="h-8 w-8 rounded-full bg-card/60 flex items-center justify-center press shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {missed.length > 3 && (
              <button onClick={() => actions.clearMissedReminders()} className="text-xs text-muted-foreground underline">
                Clear all {missed.length}
              </button>
            )}
          </div>
        )}
        {children}
      </main>
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
