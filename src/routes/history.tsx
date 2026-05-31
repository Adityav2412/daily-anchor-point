import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { formatISTDate, lastNDays } from "@/lib/ist";
import { Bar, BarChart, CartesianGrid, LabelList, Legend, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: [{ title: "Stats — daily." }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const habits = useStore((s) => s.habits);
  const days = useStore((s) => s.days);
  const [selected, setSelected] = useState<string | null>(null);

  const chartData = useMemo(() => {
    return lastNDays(14).map((k) => {
      const d = days[k];
      const totalH = habits.length || 1;
      const done = habits.filter((h) => d?.habits[h.id]?.done).length;
      const studyMin = d?.study.entries.reduce((a, e) => a + e.minutes, 0) ?? 0;
      return {
        date: formatISTDate(k),
        key: k,
        habits: Math.round((done / totalH) * 100),
        study: +(studyMin / 60).toFixed(2),
        energy: d?.study.energy ?? 0,
      };
    });
  }, [habits, days]);

  const allKeys = Object.keys(days).sort().reverse();
  const ink = "currentColor";
  const gridStroke = "color-mix(in oklab, currentColor 18%, transparent)";

  return (
    <AppShell title="Stats">
      <div className="space-y-4 stagger">
        <Section title="Habits" subtitle="% completed per day" accent="card-mint">
          <div className="text-foreground">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 20, right: 12, left: 4, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="date" tick={{ fill: ink, fontSize: 10 }} tickLine={false} axisLine={false} interval={1} label={{ value: "Date", position: "insideBottom", offset: -12, fontSize: 11, fill: ink }} />
                <YAxis tick={{ fill: ink, fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 100]} label={{ value: "% done", angle: -90, position: "insideLeft", fontSize: 11, fill: ink }} />
                <Legend verticalAlign="top" height={24} iconType="square" wrapperStyle={{ fontSize: 11, color: ink }} />
                <Bar dataKey="habits" name="Habits %" radius={[6, 6, 0, 0]} fill={ink}>
                  <LabelList dataKey="habits" position="top" fontSize={9} fill={ink} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Study" subtitle="hours per day" accent="card-lavender">
          <div className="text-foreground">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 20, right: 12, left: 4, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="date" tick={{ fill: ink, fontSize: 10 }} tickLine={false} axisLine={false} interval={1} label={{ value: "Date", position: "insideBottom", offset: -12, fontSize: 11, fill: ink }} />
                <YAxis tick={{ fill: ink, fontSize: 10 }} tickLine={false} axisLine={false} label={{ value: "Hours", angle: -90, position: "insideLeft", fontSize: 11, fill: ink }} />
                <Legend verticalAlign="top" height={24} iconType="square" wrapperStyle={{ fontSize: 11, color: ink }} />
                <Bar dataKey="study" name="Study hours" radius={[6, 6, 0, 0]} fill={ink}>
                  <LabelList dataKey="study" position="top" fontSize={9} fill={ink} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Energy" subtitle="1–5 scale" accent="card-peach">
          <div className="text-foreground">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 20, right: 16, left: 4, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="date" tick={{ fill: ink, fontSize: 10 }} tickLine={false} axisLine={false} interval={1} label={{ value: "Date", position: "insideBottom", offset: -12, fontSize: 11, fill: ink }} />
                <YAxis tick={{ fill: ink, fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 5]} ticks={[0,1,2,3,4,5]} label={{ value: "Energy", angle: -90, position: "insideLeft", fontSize: 11, fill: ink }} />
                <Legend verticalAlign="top" height={24} iconType="line" wrapperStyle={{ fontSize: 11, color: ink }} />
                <Line type="monotone" dataKey="energy" name="Energy (1–5)" stroke={ink} strokeWidth={2.5} dot={{ r: 3, fill: ink }}>
                  <LabelList dataKey="energy" position="top" fontSize={9} fill={ink} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>




        <section>
          <header className="flex items-baseline justify-between px-1 mb-3 mt-2">
            <div className="flex items-baseline gap-2">
              <h2 className="font-display text-2xl tracking-tight">Daily log</h2>
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">archive</span>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums bg-foreground/5 px-2.5 py-1 rounded-full">{allKeys.length}</span>
          </header>
          <div className="space-y-2 stagger">
            {allKeys.length === 0 && <div className="card-paper rounded-2xl py-6 text-center text-sm text-muted-foreground italic">Nothing logged yet.</div>}
            {allKeys.map((k) => {
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

function Section({ title, subtitle, accent, children }: { title: string; subtitle?: string; accent: string; children: React.ReactNode }) {
  return (
    <section>
      <header className="flex items-baseline justify-between px-1 mb-3 mt-2">
        <div className="flex items-baseline gap-2">
          <h2 className="font-display text-2xl tracking-tight">{title}</h2>
          {subtitle && <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{subtitle}</span>}
        </div>
      </header>
      <div className={`rounded-[24px] p-4 ${accent}`}>{children}</div>
    </section>
  );
}
