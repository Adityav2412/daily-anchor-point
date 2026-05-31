import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { formatISTDate } from "@/lib/ist";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: [{ title: "Stats — daily." }] }),
  component: HistoryPage,
});

const ENERGY_EMOJI = ["·", "😴", "🙁", "😐", "🙂", "🔥"];

function HistoryPage() {
  const habits = useStore((s) => s.habits);
  const days = useStore((s) => s.days);
  const startKey = useStore((s) => s.dataStartKey);
  const [selected, setSelected] = useState<string | null>(null);

  const visibleKeys = useMemo(() => {
    if (!startKey) return [];
    return Object.keys(days).filter((k) => k >= startKey).sort();
  }, [days, startKey]);

  const rows = useMemo(() => {
    const total = habits.length || 1;
    return visibleKeys.map((k) => {
      const d = days[k];
      const done = habits.filter((h) => d?.habits[h.id]?.done).length;
      const studyMin = d?.study.entries.reduce((a, e) => a + e.minutes, 0) ?? 0;
      const hrs = +(studyMin / 60).toFixed(1);
      return {
        key: k,
        date: formatISTDate(k),
        habitsPct: Math.round((done / total) * 100),
        habitsAll: total > 0 && done === total,
        habitsAny: done > 0,
        study: hrs,
        energy: d?.study.energy ?? 0,
      };
    });
  }, [habits, days, visibleKeys]);

  const maxStudy = Math.max(0.01, ...rows.map((r) => r.study));

  const empty = rows.length === 0;

  return (
    <AppShell title="Stats">
      <div className="space-y-4 stagger">
        {empty && (
          <div className="card-paper rounded-2xl p-5 text-center text-sm text-muted-foreground italic">
            Stats will begin from {startKey ? formatISTDate(startKey) : "tomorrow"}.
          </div>
        )}

        <Section title="Habits" accent="card-mint">
          {empty ? <EmptyDots /> : (
            <div className="flex flex-wrap gap-2">
              {rows.map((r) => (
                <div key={r.key} className="flex flex-col items-center gap-1.5">
                  <span
                    className="w-7 h-7 rounded-md"
                    style={{ background: r.habitsAll ? "var(--success)" : r.habitsAny ? "color-mix(in oklab, var(--success) 45%, var(--muted))" : "color-mix(in oklab, currentColor 18%, transparent)" }}
                    aria-label={`${r.date}: ${r.habitsPct}%`}
                  />
                  <span className="text-[9px] text-muted-foreground tabular-nums">{r.date}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Study" accent="card-lavender">
          {empty ? <EmptyDots /> : (
            <div className="grid grid-cols-7 gap-3">
              {rows.map((r) => {
                const scale = 0.6 + (r.study / maxStudy) * 0.9;
                return (
                  <div key={r.key} className="flex flex-col items-center gap-1">
                    <span
                      className="font-display tabular-nums leading-none text-foreground"
                      style={{ fontSize: `${scale}rem`, opacity: r.study === 0 ? 0.3 : 1 }}
                    >
                      {r.study}
                    </span>
                    <span className="text-[9px] text-muted-foreground tabular-nums">{r.date}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section title="Energy" accent="card-peach">
          {empty ? <EmptyDots /> : (
            <div className="flex flex-wrap gap-3">
              {rows.map((r) => (
                <div key={r.key} className="flex flex-col items-center gap-1">
                  <span className="text-xl leading-none" style={{ opacity: r.energy === 0 ? 0.3 : 1 }}>
                    {ENERGY_EMOJI[r.energy] ?? "·"}
                  </span>
                  <span className="text-[9px] text-muted-foreground tabular-nums">{r.date}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <section>
          <header className="flex items-baseline justify-between px-1 mb-3 mt-2">
            <div className="flex items-baseline gap-2">
              <h2 className="font-display text-2xl tracking-tight">Daily log</h2>
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">archive</span>
            </div>
            <span suppressHydrationWarning className="text-xs text-muted-foreground tabular-nums bg-foreground/5 px-2.5 py-1 rounded-full">{visibleKeys.length}</span>
          </header>
          <div className="space-y-2 stagger">
            {visibleKeys.length === 0 && <div className="card-paper rounded-2xl py-6 text-center text-sm text-muted-foreground italic">Nothing logged yet.</div>}
            {[...visibleKeys].reverse().map((k) => {
              const d = days[k];
              const done = habits.filter((h) => d.habits[h.id]?.done).length;
              const sm = d.study.entries.reduce((a, e) => a + e.minutes, 0);
              const isSel = selected === k;
              return (
                <button
                  key={k}
                  onClick={() => setSelected(isSel ? null : k)}
                  className={`w-full text-left rounded-2xl p-4 press transition ${isSel ? "card-butter" : "card-paper"}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-display text-sm w-20">{formatISTDate(k)}</span>
                    <span className="text-xs text-muted-foreground flex-1">{done}/{habits.length} habits · {Math.floor(sm/60)}h {sm%60}m</span>
                    {d.study.win && <span className="text-base">✨</span>}
                  </div>
                  {isSel && (
                    <div className="mt-3 pt-3 border-t border-foreground/10 animate-fade-up space-y-2">
                      {d.study.win && <p className="text-sm"><span className="font-display text-xs uppercase tracking-wider text-muted-foreground">Win — </span>{d.study.win}</p>}
                      {d.study.reflection && <p className="text-sm italic text-muted-foreground">"{d.study.reflection}"</p>}
                      {d.study.entries.length > 0 && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2">Study</p>
                          {d.study.entries.map((e, i) => <p key={i} className="text-xs text-foreground/70">· {e.subject} — {Math.floor(e.minutes/60)}h {e.minutes%60}m</p>)}
                        </div>
                      )}
                      {habits.length > 0 && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2">Habits</p>
                          {habits.map((h) => {
                            const log = d.habits[h.id];
                            return <p key={h.id} className="text-xs text-foreground/70">{log?.done ? "✓" : "○"} {h.name}{log && !log.done && log.reason ? ` — ${log.reason}` : ""}</p>;
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function EmptyDots() {
  return (
    <div className="text-center text-xs text-muted-foreground italic py-2">No data yet.</div>
  );
}

function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <section>
      <header className="flex items-baseline justify-between px-1 mb-3 mt-2">
        <h2 className="font-display text-2xl tracking-tight">{title}</h2>
      </header>
      <div className={`rounded-[24px] p-4 ${accent}`}>{children}</div>
    </section>
  );
}
