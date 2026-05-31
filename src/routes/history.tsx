import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { formatISTDate, lastNDays } from "@/lib/ist";
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: [{ title: "History — FocusFlow" }] }),
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
  const sel = selected ? days[selected] : null;

  return (
    <AppShell title="History" subtitle="Every day, kept.">
      <Section title="Habit completion (14 days)">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData}>
            <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} interval={1} />
            <YAxis hide domain={[0, 100]} />
            <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
            <Bar dataKey="habits" radius={[8, 8, 0, 0]} fill="oklch(0.18 0.01 260)" />
          </BarChart>
        </ResponsiveContainer>
      </Section>

      <Section title="Study hours per day">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData}>
            <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} interval={1} />
            <YAxis hide />
            <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
            <Bar dataKey="study" radius={[8, 8, 0, 0]} fill="oklch(0.7 0.15 290)" />
          </BarChart>
        </ResponsiveContainer>
      </Section>

      <Section title="Energy level">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData}>
            <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} interval={1} />
            <YAxis hide domain={[0, 5]} />
            <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
            <Line type="monotone" dataKey="energy" stroke="oklch(0.6 0.2 30)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </Section>

      <Section title="Full daily log">
        <div className="space-y-2">
          {allKeys.length === 0 && <p className="text-sm text-foreground/60">Nothing logged yet.</p>}
          {allKeys.map((k) => {
            const d = days[k];
            const done = habits.filter((h) => d.habits[h.id]?.done).length;
            const sm = d.study.entries.reduce((a, e) => a + e.minutes, 0);
            return (
              <button
                key={k}
                onClick={() => setSelected(selected === k ? null : k)}
                className="w-full text-left card-soft border p-3 flex items-center gap-3 hover:bg-secondary/50"
              >
                <span className="text-xs font-semibold w-20">{formatISTDate(k)}</span>
                <span className="text-xs text-foreground/60 flex-1">{done}/{habits.length} habits · {Math.floor(sm/60)}h {sm%60}m study</span>
                {d.study.win && <span className="text-xs">✨</span>}
              </button>
            );
          })}
        </div>
      </Section>

      {sel && (
        <div className="card-soft border p-4 mt-4">
          <p className="text-xs font-semibold mb-3">{formatISTDate(selected!)} details</p>
          {sel.study.win && <p className="text-sm mb-2"><span className="font-semibold">Win:</span> {sel.study.win}</p>}
          {sel.study.reflection && <p className="text-sm mb-2 text-foreground/70">"{sel.study.reflection}"</p>}
          {sel.study.entries.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-semibold mb-1">Study</p>
              {sel.study.entries.map((e, i) => <p key={i} className="text-xs text-foreground/70">• {e.subject} — {Math.floor(e.minutes/60)}h {e.minutes%60}m</p>)}
            </div>
          )}
          {habits.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold mb-1">Habits</p>
              {habits.map((h) => {
                const log = sel.habits[h.id];
                return <p key={h.id} className="text-xs text-foreground/70">{log?.done ? "✓" : "○"} {h.name}{log && !log.done && log.reason ? ` — ${log.reason}` : ""}</p>;
              })}
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-soft border p-4 mb-4">
      <p className="text-xs font-semibold mb-3 text-foreground/60 uppercase tracking-wider">{title}</p>
      {children}
    </div>
  );
}
