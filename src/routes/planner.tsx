import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { actions, useStore, useToday } from "@/lib/store";
import { istDateKey, lastNDays, formatISTDate } from "@/lib/ist";
import { Plus, X } from "lucide-react";

export const Route = createFileRoute("/planner")({
  head: () => ({ meta: [{ title: "Plan — daily." }] }),
  component: PlannerPage,
});

function diffMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60; // wrap past midnight
  return mins;
}

function fmtHM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function PlannerPage() {
  const today = useToday();
  const allDays = useStore((s) => s.days);
  const [activity, setActivity] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");

  const log = today.timeLog ?? [];

  const summary = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of log) {
      const key = e.activity.trim().toLowerCase();
      map.set(key, (map.get(key) ?? 0) + diffMinutes(e.start, e.end));
    }
    return Array.from(map.entries())
      .map(([k, mins]) => ({ activity: k, mins }))
      .sort((a, b) => b.mins - a.mins);
  }, [log]);

  const weekKeys = useMemo(() => lastNDays(7), []);
  const todayKey = istDateKey();

  return (
    <AppShell title="Plan">
      <div className="space-y-4 stagger">
        {/* Add entry */}
        <div className="card-paper rounded-[24px] p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">What did I do?</div>
          <input
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
            placeholder="Activity (e.g. Study, Walk, Cook)"
            className="w-full rounded-full bg-muted px-4 py-2.5 text-sm outline-none mb-2 placeholder:text-foreground/40"
          />
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="rounded-full bg-muted px-3 py-2 text-xs outline-none" />
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="rounded-full bg-muted px-3 py-2 text-xs outline-none" />
            <button
              onClick={() => {
                if (activity.trim() && start && end) {
                  actions.addTimeLog({ activity: activity.trim(), start, end });
                  setActivity("");
                }
              }}
              className="rounded-full bg-foreground text-background px-4 press flex items-center gap-1 text-sm"
            ><Plus size={14} /> Log</button>
          </div>
        </div>

        {/* Today log */}
        <section>
          <header className="flex items-baseline justify-between px-1 mb-3 mt-2">
            <h2 className="font-display text-2xl tracking-tight">Today</h2>
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{log.length} entries</span>
          </header>
          <div className="space-y-2 stagger">
            {log.length === 0 ? (
              <div className="card-paper rounded-2xl py-6 text-center text-sm text-muted-foreground italic">Nothing logged yet. That's okay.</div>
            ) : (
              log
                .slice()
                .sort((a, b) => a.start.localeCompare(b.start))
                .map((e) => (
                  <div key={e.id} className="card-paper rounded-2xl p-4 flex items-center gap-3">
                    <span className="font-display text-sm tabular-nums w-24">{e.start}–{e.end}</span>
                    <span className="flex-1 text-[15px]">{e.activity}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{fmtHM(diffMinutes(e.start, e.end))}</span>
                    <button onClick={() => actions.removeTimeLog(e.id)} className="text-foreground/40 hover:text-foreground transition"><X size={14} /></button>
                  </div>
                ))
            )}
          </div>
        </section>

        {/* End of day summary */}
        {summary.length > 0 && (
          <div className="card-butter rounded-[24px] p-5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/60 mb-3">End of day</div>
            <div className="space-y-1.5">
              {summary.map((s) => (
                <div key={s.activity} className="flex items-baseline justify-between text-sm">
                  <span className="capitalize">{s.activity}</span>
                  <span className="font-display tabular-nums">{fmtHM(s.mins)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weekly view */}
        <section>
          <header className="flex items-baseline justify-between px-1 mb-3 mt-2">
            <h2 className="font-display text-2xl tracking-tight">This week</h2>
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">hours per activity</span>
          </header>
          <div className="space-y-2 stagger">
            {weekKeys.slice().reverse().map((k) => {
              const day = allDays[k];
              const entries = day?.timeLog ?? [];
              if (entries.length === 0) {
                return (
                  <div key={k} className="card-paper rounded-2xl p-3 flex items-center gap-3">
                    <span className="font-display text-sm w-20">{formatISTDate(k)}{k === todayKey && <span className="text-muted-foreground"> · today</span>}</span>
                    <span className="text-xs text-muted-foreground italic flex-1">Nothing logged.</span>
                  </div>
                );
              }
              const map = new Map<string, number>();
              for (const e of entries) {
                const key = e.activity.trim().toLowerCase();
                map.set(key, (map.get(key) ?? 0) + diffMinutes(e.start, e.end));
              }
              return (
                <div key={k} className="card-paper rounded-2xl p-3">
                  <div className="font-display text-sm mb-1.5">{formatISTDate(k)}{k === todayKey && <span className="text-muted-foreground text-xs"> · today</span>}</div>
                  <div className="space-y-1">
                    {Array.from(map.entries()).sort((a, b) => b[1] - a[1]).map(([a, m]) => (
                      <div key={a} className="flex items-baseline justify-between text-xs">
                        <span className="capitalize text-foreground/80">{a}</span>
                        <span className="tabular-nums text-muted-foreground">{fmtHM(m)}</span>
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
