import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { actions, useStore, useToday } from "@/lib/store";
import { lastNDays, formatISTDate, formatHM, nowIST, istDateKey } from "@/lib/ist";
import { X, Plus } from "lucide-react";

export const Route = createFileRoute("/planner")({
  head: () => ({ meta: [{ title: "Time — daily." }] }),
  component: TimeTrackerPage,
});

function todayTimeStr(offsetMin = 0): string {
  const d = nowIST();
  d.setMinutes(d.getMinutes() + offsetMin);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function isoFromDateAndHHMM(dateKey: string, hhmm: string): string {
  const [y, mo, da] = dateKey.split("-").map(Number);
  const [h, m] = hhmm.split(":").map(Number);
  const ist = new Date(y, mo - 1, da, h, m, 0, 0);
  const offsetMs = (ist.getTimezoneOffset() + 330) * 60000;
  return new Date(ist.getTime() - offsetMs).toISOString();
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function TimeTrackerPage() {
  useToday();
  const allDays = useStore((s) => s.days);

  const [date, setDate] = useState(istDateKey());
  const [topic, setTopic] = useState("");
  const [startTime, setStartTime] = useState(todayTimeStr(-60));
  const [endTime, setEndTime] = useState(todayTimeStr(0));

  const duration = useMemo(() => {
    try {
      const s = isoFromDateAndHHMM(date, startTime);
      const e = isoFromDateAndHHMM(date, endTime);
      return Math.round((new Date(e).getTime() - new Date(s).getTime()) / 60000);
    } catch { return 0; }
  }, [date, startTime, endTime]);

  const log = () => {
    if (!topic.trim() || duration <= 0) return;
    const startISO = isoFromDateAndHHMM(date, startTime);
    const endISO = isoFromDateAndHHMM(date, endTime);
    // Save into that date's day
    const targetDay = allDays[date];
    // Use actions.addStudySession only stores into today's key. We need direct store.set fallback.
    if (date === istDateKey() || !targetDay) {
      actions.addStudySession({ subject: topic.trim(), startISO, endISO, durationMin: duration });
    } else {
      // store for a past day via raw store mutation
      import("@/lib/store").then(({ store }) => {
        store.set((s) => {
          if (!s.days[date]) return s;
          const id = crypto.randomUUID();
          s.days[date].study.sessions = s.days[date].study.sessions ?? [];
          s.days[date].study.sessions.push({ id, subject: topic.trim(), startISO, endISO, durationMin: duration });
          s.days[date].timeSessions = s.days[date].timeSessions ?? [];
          s.days[date].timeSessions.push({ id, category: "Study", startISO, endISO, durationMin: duration });
          return s;
        });
      });
    }
    setTopic("");
  };

  const last7 = useMemo(() => lastNDays(7), []);

  type Entry = { id: string; date: string; subject: string; minutes: number };
  const history: Entry[] = useMemo(() => {
    const list: Entry[] = [];
    Object.keys(allDays).forEach((k) => {
      const sess = allDays[k].study.sessions ?? [];
      sess.forEach((s) => list.push({ id: s.id, date: k, subject: s.subject, minutes: s.durationMin }));
    });
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [allDays]);

  const weekTotal = useMemo(() => {
    return last7.reduce((sum, k) => {
      const d = allDays[k];
      return sum + ((d?.study.sessions ?? []).reduce((a, s) => a + s.durationMin, 0));
    }, 0);
  }, [allDays, last7]);

  const byDay = useMemo(() => last7.map((k) => {
    const d = allDays[k];
    const mins = (d?.study.sessions ?? []).reduce((a, s) => a + s.durationMin, 0);
    const [y, mo, da] = k.split("-").map(Number);
    const weekday = new Date(y, mo - 1, da).getDay();
    return { key: k, mins, weekday };
  }), [allDays, last7]);

  const maxMins = Math.max(1, ...byDay.map((d) => d.mins));
  const mostProductive = byDay.reduce((best, d) => d.mins > best.mins ? d : best, byDay[0] ?? { weekday: 0, mins: 0 });

  return (
    <AppShell title="Time">
      <div className="space-y-4 stagger">
        {/* Manual entry */}
        <div className="card-amber p-5 space-y-3">
          <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/60">Log study time</div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={istDateKey()}
            className="w-full rounded-full bg-background/70 px-4 py-2.5 text-sm outline-none"
          />
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Topic studied"
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
              <span className="text-xs text-foreground/70 tabular-nums">{duration > 0 ? formatHM(duration) : "—"}</span>
            </div>
          </div>
          <button onClick={log} disabled={duration <= 0 || !topic.trim()}
            className="w-full rounded-full bg-foreground text-background py-2.5 text-sm press flex items-center justify-center gap-2 disabled:opacity-40">
            <Plus size={14} /> Add entry
          </button>
        </div>

        {/* Weekly insights */}
        <section>
          <header className="flex items-baseline justify-between px-1 mb-3 mt-2">
            <h2 className="font-display text-2xl tracking-tight">This week</h2>
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums">{formatHM(weekTotal)}</span>
          </header>
          <div className="card-paper p-5">
            <div className="flex items-end gap-2 h-24 mb-2">
              {byDay.map((d) => {
                const h = (d.mins / maxMins) * 100;
                return (
                  <div key={d.key} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full flex-1 flex items-end">
                      <div className="w-full rounded-t-md bg-amber transition-all duration-700"
                        style={{ height: `${Math.max(3, h)}%`, opacity: d.mins === 0 ? 0.25 : 1 }} />
                    </div>
                    <span className="text-[9px] text-foreground/55">{WEEKDAYS[d.weekday]}</span>
                  </div>
                );
              })}
            </div>
            {weekTotal > 0 && (
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
              <div className="card-paper py-6 text-center text-sm text-muted-foreground italic">No study time logged yet.</div>
            ) : (
              history.slice(0, 30).map((h) => (
                <div key={h.id + h.date} className="card-paper p-3 flex items-center gap-3">
                  <span className="text-xs tabular-nums w-14 text-muted-foreground">{formatISTDate(h.date)}</span>
                  <span className="flex-1 text-[15px] truncate">{h.subject}</span>
                  <span className="text-xs tabular-nums text-amber font-semibold">{formatHM(h.minutes)}</span>
                  <button
                    onClick={() => {
                      import("@/lib/store").then(({ store }) => {
                        store.set((s) => {
                          if (!s.days[h.date]) return s;
                          s.days[h.date].study.sessions = (s.days[h.date].study.sessions ?? []).filter((x) => x.id !== h.id);
                          s.days[h.date].timeSessions = (s.days[h.date].timeSessions ?? []).filter((x) => x.id !== h.id);
                          return s;
                        });
                      });
                    }}
                    className="text-foreground/30 hover:text-foreground transition"
                  ><X size={12} /></button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
