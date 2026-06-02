import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { actions, useStore, useToday } from "@/lib/store";
import { lastNDays, formatISTDate, formatClock, formatHM } from "@/lib/ist";
import { Pause, Play, X } from "lucide-react";

export const Route = createFileRoute("/planner")({
  head: () => ({ meta: [{ title: "Time — daily." }] }),
  component: TimeTrackerPage,
});

const PRESETS = ["Study", "Exercise", "Rest", "Work"];

function TimeTrackerPage() {
  const today = useToday();
  const allDays = useStore((s) => s.days);
  const customs = useStore((s) => s.customCategories ?? []);

  const [category, setCategory] = useState<string>("Study");
  const [customInput, setCustomInput] = useState("");
  const [running, setRunning] = useState(false);
  const [startISO, setStartISO] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const intRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [view, setView] = useState<"week" | "month">("week");

  useEffect(() => {
    if (!running || !startISO) return;
    intRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(startISO).getTime()) / 1000));
    }, 1000);
    return () => { if (intRef.current) clearInterval(intRef.current); };
  }, [running, startISO]);

  const start = () => {
    const cat = customInput.trim() ? customInput.trim() : category;
    if (!cat) return;
    if (customInput.trim()) {
      actions.addCustomCategory(customInput.trim());
      setCategory(customInput.trim());
      setCustomInput("");
    }
    setStartISO(new Date().toISOString());
    setElapsed(0);
    setRunning(true);
  };

  const stop = () => {
    if (!startISO) return;
    const endISO = new Date().toISOString();
    const durationMin = Math.max(1, Math.round((new Date(endISO).getTime() - new Date(startISO).getTime()) / 60000));
    actions.addTimeSession({ category, startISO, endISO, durationMin });
    setRunning(false);
    setStartISO(null);
    setElapsed(0);
  };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  const sessions = today.timeSessions ?? [];

  // aggregate
  const periodKeys = useMemo(() => lastNDays(view === "week" ? 7 : 30), [view]);
  const aggregate = useMemo(() => {
    const map = new Map<string, number>();
    for (const k of periodKeys) {
      const d = allDays[k];
      if (!d?.timeSessions) continue;
      for (const s of d.timeSessions) {
        map.set(s.category, (map.get(s.category) ?? 0) + s.durationMin);
      }
    }
    return Array.from(map.entries())
      .map(([category, mins]) => ({ category, mins }))
      .sort((a, b) => b.mins - a.mins);
  }, [allDays, periodKeys]);

  const maxMins = Math.max(1, ...aggregate.map((a) => a.mins));
  const allCats = Array.from(new Set([...PRESETS, ...customs]));

  return (
    <AppShell title="Time">
      <div className="space-y-4 stagger">
        {/* Timer */}
        <div className="card-peach rounded-[24px] p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/60 mb-3">Track time</div>

          {!running && (
            <>
              <div className="flex flex-wrap gap-2 mb-3">
                {allCats.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`rounded-full px-3 py-1.5 text-xs press transition ${category === c ? "bg-foreground text-background" : "bg-background/70"}`}
                  >{c}</button>
                ))}
              </div>
              <input
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Or type a new category…"
                className="w-full rounded-full bg-background/70 px-4 py-2 text-sm outline-none mb-3 placeholder:text-foreground/40"
              />
            </>
          )}

          <div className="flex items-center justify-between">
            <div>
              <div className="font-display text-5xl tabular-nums leading-none">{mm}:{ss}</div>
              {running && <div className="text-xs text-foreground/60 mt-1">{category}</div>}
            </div>
            {!running ? (
              <button onClick={start} className="h-12 px-5 rounded-full bg-foreground text-background flex items-center gap-2 press">
                <Play size={16} /> Start
              </button>
            ) : (
              <button onClick={stop} className="h-12 px-5 rounded-full bg-foreground text-background flex items-center gap-2 press">
                <Pause size={16} /> Stop
              </button>
            )}
          </div>
        </div>

        {/* Today's sessions */}
        <section>
          <header className="flex items-baseline justify-between px-1 mb-3 mt-2">
            <h2 className="font-display text-2xl tracking-tight">Today</h2>
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{sessions.length} sessions</span>
          </header>
          <div className="space-y-2 stagger">
            {sessions.length === 0 ? (
              <div className="card-paper rounded-2xl py-6 text-center text-sm text-muted-foreground italic">Nothing tracked yet. Press Start whenever.</div>
            ) : (
              sessions.slice().sort((a, b) => a.startISO.localeCompare(b.startISO)).map((s) => (
                <div key={s.id} className="card-paper rounded-2xl p-4 flex items-center gap-3">
                  <span className="font-display text-sm tabular-nums w-24">{formatClock(s.startISO)}–{formatClock(s.endISO)}</span>
                  <span className="flex-1 text-[15px]">{s.category}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{formatHM(s.durationMin)}</span>
                  <button onClick={() => actions.removeTimeSession(s.id)} className="text-foreground/40 hover:text-foreground transition"><X size={14} /></button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* View toggle + aggregate */}
        <section>
          <header className="flex items-baseline justify-between px-1 mb-3 mt-2">
            <h2 className="font-display text-2xl tracking-tight">{view === "week" ? "This week" : "This month"}</h2>
            <div className="flex gap-1 bg-foreground/5 rounded-full p-1">
              <button onClick={() => setView("week")} className={`px-3 py-1 rounded-full text-xs press transition ${view === "week" ? "bg-foreground text-background" : ""}`}>7d</button>
              <button onClick={() => setView("month")} className={`px-3 py-1 rounded-full text-xs press transition ${view === "month" ? "bg-foreground text-background" : ""}`}>30d</button>
            </div>
          </header>

          {aggregate.length === 0 ? (
            <div className="card-paper rounded-2xl py-6 text-center text-sm text-muted-foreground italic">No sessions yet.</div>
          ) : (
            <div className="card-butter rounded-[24px] p-5 space-y-3">
              {aggregate.map((a) => (
                <div key={a.category}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-sm font-medium">{a.category}</span>
                    <span className="text-xs tabular-nums text-foreground/65">{formatHM(a.mins)}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-background/60 overflow-hidden">
                    <div className="h-full bg-foreground transition-all duration-700" style={{ width: `${(a.mins / maxMins) * 100}%` }} />
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-foreground/55 italic pt-1">Most time: <span className="font-semibold not-italic">{aggregate[0].category}</span></p>
            </div>
          )}
        </section>

        {/* Daily breakdown text list */}
        <section>
          <header className="flex items-baseline justify-between px-1 mb-3 mt-2">
            <h2 className="font-display text-xl tracking-tight">By day</h2>
          </header>
          <div className="space-y-2 stagger">
            {periodKeys.slice().reverse().map((k) => {
              const d = allDays[k];
              const ent = d?.timeSessions ?? [];
              if (ent.length === 0) return null;
              const map = new Map<string, number>();
              for (const e of ent) map.set(e.category, (map.get(e.category) ?? 0) + e.durationMin);
              return (
                <div key={k} className="card-paper rounded-2xl p-3">
                  <div className="font-display text-sm mb-1.5">{formatISTDate(k)}</div>
                  <div className="space-y-1">
                    {Array.from(map.entries()).sort((a, b) => b[1] - a[1]).map(([cat, m]) => (
                      <div key={cat} className="flex items-baseline justify-between text-xs">
                        <span className="text-foreground/80">{cat}</span>
                        <span className="tabular-nums text-muted-foreground">{formatHM(m)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
