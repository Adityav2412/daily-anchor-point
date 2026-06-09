import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStore, useToday } from "@/lib/store";
import { lastNDays, formatISTDate, formatHM } from "@/lib/ist";

export const Route = createFileRoute("/planner")({
  head: () => ({ meta: [{ title: "Time — daily." }] }),
  component: TimeTrackerPage,
});

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function TimeTrackerPage() {
  useToday();
  const allDays = useStore((s) => s.days);
  const [range, setRange] = useState<7 | 30>(7);

  const days = useMemo(() => lastNDays(range), [range]);

  type Entry = { id: string; date: string; subject: string; minutes: number };
  const history: Entry[] = useMemo(() => {
    const list: Entry[] = [];
    Object.keys(allDays).forEach((k) => {
      const sess = allDays[k].study.sessions ?? [];
      sess.forEach((s) => list.push({ id: s.id, date: k, subject: s.subject, minutes: s.durationMin }));
    });
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [allDays]);

  const total = useMemo(() => days.reduce((sum, k) => {
    const d = allDays[k];
    return sum + ((d?.study.sessions ?? []).reduce((a, s) => a + s.durationMin, 0));
  }, 0), [allDays, days]);

  const byDay = useMemo(() => days.map((k) => {
    const d = allDays[k];
    const mins = (d?.study.sessions ?? []).reduce((a, s) => a + s.durationMin, 0);
    const [y, mo, da] = k.split("-").map(Number);
    const weekday = new Date(y, mo - 1, da).getDay();
    return { key: k, mins, weekday };
  }), [allDays, days]);

  const maxMins = Math.max(1, ...byDay.map((d) => d.mins));
  const mostProductive = byDay.reduce((best, d) => d.mins > best.mins ? d : best, byDay[0] ?? { weekday: 0, mins: 0, key: "" });

  return (
    <AppShell title="Time">
      <div className="space-y-4 stagger">
        <div className="flex justify-center -mt-2 mb-1"><TimeHourglass className="h-20 w-auto" /></div>
        {/* Summary */}
        <div className="card-amber p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/60 mb-1">This {range === 7 ? "week" : "month"}</div>
          <div className="font-display text-4xl leading-none">{formatHM(total)}</div>
          <p className="text-xs text-foreground/65 mt-2 italic">Synced automatically from Study tab.</p>
        </div>

        {/* Range toggle */}
        <div className="flex rounded-full bg-muted p-0.5 w-fit">
          <button onClick={() => setRange(7)} className={`text-[11px] uppercase tracking-wider px-4 py-1.5 rounded-full press ${range === 7 ? "bg-amber text-[#0A0A0A]" : "text-foreground/60"}`}>7 days</button>
          <button onClick={() => setRange(30)} className={`text-[11px] uppercase tracking-wider px-4 py-1.5 rounded-full press ${range === 30 ? "bg-amber text-[#0A0A0A]" : "text-foreground/60"}`}>30 days</button>
        </div>

        {/* Bar chart */}
        <section>
          <header className="flex items-baseline justify-between px-1 mb-3 mt-2">
            <h2 className="font-display text-2xl tracking-tight">Daily breakdown</h2>
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums">{formatHM(total)}</span>
          </header>
          <div className="card-paper p-5">
            <div className="flex items-end gap-1.5 h-28 mb-2">
              {byDay.map((d) => {
                const h = (d.mins / maxMins) * 100;
                return (
                  <div key={d.key} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full flex-1 flex items-end">
                      <div className="w-full rounded-t-md bg-amber transition-all duration-700"
                        style={{ height: `${Math.max(3, h)}%`, opacity: d.mins === 0 ? 0.25 : 1 }} />
                    </div>
                    {range === 7 && <span className="text-[9px] text-foreground/55">{WEEKDAYS[d.weekday]}</span>}
                  </div>
                );
              })}
            </div>
            {total > 0 && range === 7 && (
              <p className="text-xs text-foreground/65 mt-2">
                Most productive day: <span className="font-semibold text-foreground">{WEEKDAYS[mostProductive.weekday]}</span> ({formatHM(mostProductive.mins)})
              </p>
            )}
          </div>
        </section>

        {/* History list */}
        <section>
          <header className="flex items-baseline justify-between px-1 mb-3 mt-2">
            <h2 className="font-display text-2xl tracking-tight">History</h2>
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{history.length} entries</span>
          </header>
          <div className="space-y-2 stagger">
            {history.length === 0 ? (
              <div className="card-paper py-6 text-center text-sm text-muted-foreground italic">Log study sessions in the Study tab — they'll appear here.</div>
            ) : (
              history.slice(0, 30).map((h) => (
                <div key={h.id + h.date} className="card-paper p-3 flex items-center gap-3">
                  <span className="text-xs tabular-nums w-14 text-muted-foreground">{formatISTDate(h.date)}</span>
                  <span className="flex-1 text-[15px] truncate">{h.subject}</span>
                  <span className="text-xs tabular-nums text-amber font-semibold">{formatHM(h.minutes)}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
