import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { actions, useStore, useToday } from "@/lib/store";
import { lastNDays, formatISTDate, formatClock, formatHM, nowIST } from "@/lib/ist";
import { X, Plus } from "lucide-react";

export const Route = createFileRoute("/planner")({
  head: () => ({ meta: [{ title: "Time — daily." }] }),
  component: TimeTrackerPage,
});

const PRESETS = ["Study", "Exercise", "Rest", "Work", "Other"];

function todayTimeStr(offsetMin = 0): string {
  const d = nowIST();
  d.setMinutes(d.getMinutes() + offsetMin);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Build today's ISO from an HH:mm string (interpreted as IST wall time).
function isoFromTodayHHMM(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const ist = nowIST();
  ist.setHours(h, m, 0, 0);
  // Convert IST wall time back to actual instant.
  const offsetMs = (ist.getTimezoneOffset() + 330) * 60000;
  return new Date(ist.getTime() - offsetMs).toISOString();
}

function TimeTrackerPage() {
  const today = useToday();
  const allDays = useStore((s) => s.days);
  const customs = useStore((s) => s.customCategories ?? []);

  const [activity, setActivity] = useState("");
  const [category, setCategory] = useState<string>("Study");
  const [customInput, setCustomInput] = useState("");
  const [startTime, setStartTime] = useState(todayTimeStr(-30));
  const [endTime, setEndTime] = useState(todayTimeStr(0));
  const [view, setView] = useState<"week" | "month">("week");

  const duration = useMemo(() => {
    try {
      const s = isoFromTodayHHMM(startTime);
      const e = isoFromTodayHHMM(endTime);
      const min = Math.round((new Date(e).getTime() - new Date(s).getTime()) / 60000);
      return min;
    } catch { return 0; }
  }, [startTime, endTime]);

  const log = () => {
    const cat = customInput.trim() ? customInput.trim() : category;
    if (!cat) return;
    if (duration <= 0) return;
    if (customInput.trim()) {
      actions.addCustomCategory(customInput.trim());
      setCategory(customInput.trim());
      setCustomInput("");
    }
    const startISO = isoFromTodayHHMM(startTime);
    const endISO = isoFromTodayHHMM(endTime);
    actions.addTimeSession({ category: activity.trim() ? `${cat} — ${activity.trim()}` : cat, startISO, endISO, durationMin: duration });
    setActivity("");
  };

  const sessions = today.timeSessions ?? [];

  const periodKeys = useMemo(() => lastNDays(view === "week" ? 7 : 30), [view]);
  const aggregate = useMemo(() => {
    const map = new Map<string, number>();
    for (const k of periodKeys) {
      const d = allDays[k];
      if (!d?.timeSessions) continue;
      for (const s of d.timeSessions) {
        const baseCat = s.category.split(" — ")[0];
        map.set(baseCat, (map.get(baseCat) ?? 0) + s.durationMin);
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
        {/* Manual entry */}
        <div className="card-peach rounded-[24px] p-5 space-y-3">
          <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/60">Log time</div>

          <input
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
            placeholder="What did you do?"
            className="w-full rounded-full bg-background/70 px-4 py-2.5 text-sm outline-none placeholder:text-foreground/40"
          />

          <div className="flex gap-2 items-center">
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-wider text-foreground/55 mb-1 px-1">Start</div>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-full bg-background/70 px-3 py-2 text-sm outline-none tabular-nums" />
            </div>
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-wider text-foreground/55 mb-1 px-1">End</div>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-full bg-background/70 px-3 py-2 text-sm outline-none tabular-nums" />
            </div>
            <div className="shrink-0 pt-4">
              <span className="text-xs text-foreground/65 tabular-nums">{duration > 0 ? formatHM(duration) : "—"}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {allCats.map((c) => (
              <button key={c} onClick={() => setCategory(c)}
                className={`rounded-full px-3 py-1.5 text-xs press transition ${category === c ? "bg-foreground text-background" : "bg-background/70"}`}
              >{c}</button>
            ))}
          </div>

          <input
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Or type a new category…"
            className="w-full rounded-full bg-background/70 px-4 py-2 text-sm outline-none placeholder:text-foreground/40"
          />

          <button onClick={log} disabled={duration <= 0}
            className="w-full rounded-full bg-foreground text-background py-2.5 text-sm press flex items-center justify-center gap-2 disabled:opacity-40">
            <Plus size={14} /> Add entry
          </button>
        </div>

        {/* Today's sessions */}
        <section>
          <header className="flex items-baseline justify-between px-1 mb-3 mt-2">
            <h2 className="font-display text-2xl tracking-tight">Today</h2>
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{sessions.length} entries</span>
          </header>
          <div className="space-y-2 stagger">
            {sessions.length === 0 ? (
              <div className="card-paper rounded-2xl py-6 text-center text-sm text-muted-foreground italic">Nothing logged yet.</div>
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

        {/* Aggregate */}
        <section>
          <header className="flex items-baseline justify-between px-1 mb-3 mt-2">
            <h2 className="font-display text-2xl tracking-tight">{view === "week" ? "This week" : "This month"}</h2>
            <div className="flex gap-1 bg-foreground/5 rounded-full p-1">
              <button onClick={() => setView("week")} className={`px-3 py-1 rounded-full text-xs press transition ${view === "week" ? "bg-foreground text-background" : ""}`}>7d</button>
              <button onClick={() => setView("month")} className={`px-3 py-1 rounded-full text-xs press transition ${view === "month" ? "bg-foreground text-background" : ""}`}>30d</button>
            </div>
          </header>

          {aggregate.length === 0 ? (
            <div className="card-paper rounded-2xl py-6 text-center text-sm text-muted-foreground italic">No entries yet.</div>
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

        {/* By day */}
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
              for (const e of ent) {
                const baseCat = e.category.split(" — ")[0];
                map.set(baseCat, (map.get(baseCat) ?? 0) + e.durationMin);
              }
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
