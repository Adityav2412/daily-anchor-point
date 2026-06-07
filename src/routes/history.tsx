import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStore, studyMinutesFor } from "@/lib/store";
import { formatISTDate, lastNDays, formatHM } from "@/lib/ist";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: [{ title: "Stats — daily." }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const habits = useStore((s) => s.habits);
  const days = useStore((s) => s.days);
  const [studyRange, setStudyRange] = useState<7 | 30>(7);
  const [habitSel, setHabitSel] = useState<string | null>(null);
  const [ttRange, setTtRange] = useState<7 | 30>(7);

  const studyKeys = useMemo(() => lastNDays(studyRange), [studyRange]);
  const habitKeys = useMemo(() => lastNDays(7), []);
  const ttKeys = useMemo(() => lastNDays(ttRange), [ttRange]);

  const studyRows = useMemo(() => studyKeys.map((k) => {
    const d = days[k];
    const min = studyMinutesFor(d);
    return { key: k, date: formatISTDate(k), hours: +(min / 60).toFixed(1), min };
  }), [days, studyKeys]);
  const maxStudy = Math.max(0.01, ...studyRows.map((r) => r.hours));

  const habitRows = useMemo(() => habitKeys.map((k) => {
    const d = days[k];
    const total = habits.length || 1;
    const done = habits.filter((h) => d?.habits[h.id]?.done).length;
    const skipped = habits.filter((h) => d?.habits[h.id] && !d.habits[h.id].done).map((h) => ({
      name: h.name, reason: d!.habits[h.id].reason,
    }));
    const notLogged = habits.filter((h) => !d?.habits[h.id]).map((h) => h.name);
    return { key: k, date: formatISTDate(k), done, total, pct: done / total, skipped, notLogged };
  }), [days, habits, habitKeys]);

  const ttAggregate = useMemo(() => {
    const map = new Map<string, number>();
    for (const k of ttKeys) {
      const d = days[k];
      if (!d?.timeSessions) continue;
      for (const s of d.timeSessions) map.set(s.category, (map.get(s.category) ?? 0) + s.durationMin);
    }
    return Array.from(map.entries()).map(([category, mins]) => ({ category, mins })).sort((a, b) => b.mins - a.mins);
  }, [days, ttKeys]);
  const ttMax = Math.max(1, ...ttAggregate.map((a) => a.mins));

  // AI Insights
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const runInsights = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    try {
      const env = (import.meta as any).env ?? {};
      const apiKey: string | undefined = env.VITE_GEMINI_API_KEY;
      // Debug: log presence + length only (never the value)
      console.log("[AI Insights] VITE_GEMINI_API_KEY present:", !!apiKey, "length:", apiKey?.length ?? 0);
      console.log("[AI Insights] import.meta.env keys:", Object.keys(env).filter((k) => k.startsWith("VITE_")));
      if (!apiKey || apiKey.trim() === "") {
        setAiError(
          "VITE_GEMINI_API_KEY is missing at build time. Add it in Netlify → Site settings → Environment variables (or Lovable Build Secrets), then redeploy. Available VITE_* keys: " +
            (Object.keys(env).filter((k) => k.startsWith("VITE_")).join(", ") || "none")
        );
        setAiLoading(false);
        return;
      }

      const last7 = lastNDays(7);
      const summary = last7.map((k) => {
        const d = days[k];
        if (!d) return { date: k, empty: true };
        const sessions = (d.study.sessions ?? []).map((s) => ({ subject: s.subject, start: s.startISO, end: s.endISO, min: s.durationMin }));
        const habitsDone = habits.filter((h) => d.habits[h.id]?.done).map((h) => h.name);
        const habitsSkipped = habits.filter((h) => d.habits[h.id] && !d.habits[h.id].done).map((h) => ({ name: h.name, reason: d.habits[h.id].reason }));
        const time = (d.timeSessions ?? []).map((s) => ({ cat: s.category, min: s.durationMin }));
        return {
          date: k,
          energy: d.study.energy,
          studyMinutes: studyMinutesFor(d),
          sessions,
          habitsDone,
          habitsSkipped,
          time,
          win: d.study.win,
          toughDay: !!d.toughDay,
        };
      });

      const prompt = `You are a gentle, honest life coach for a student named Akshay who has OCD, sleep apnea and anxiety. Analyze this weekly data and give 3-4 short insights in simple Hindi+English mixed language. Be encouraging, never shame. Data: ${JSON.stringify(summary)}`;

      const callModel = async (model: string) => {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          }
        );
        return r;
      };
      let res = await callModel("gemini-2.0-flash");
      if (!res.ok) {
        console.warn("[AI Insights] gemini-2.0-flash failed, falling back to gemini-1.5-pro");
        res = await callModel("gemini-1.5-pro");
      }
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Gemini ${res.status}: ${t.slice(0, 200)}`);
      }
      const json = await res.json();
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "No insights returned.";
      setAiResult(text);
    } catch (e: any) {
      setAiError(e?.message ?? "Something went wrong. Try again later.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <AppShell title="Stats">
      <div className="space-y-4 stagger">

        {/* Habits donut row */}
        <section>
          <header className="flex items-baseline justify-between px-1 mb-3 mt-2">
            <h2 className="font-display text-2xl tracking-tight">Habits</h2>
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">last 7</span>
          </header>
          <div className="card-mint rounded-[24px] p-5">
            <div className="grid grid-cols-7 gap-2">
              {habitRows.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setHabitSel(habitSel === r.key ? null : r.key)}
                  className="flex flex-col items-center gap-1.5 press"
                >
                  <Donut pct={r.pct} active={habitSel === r.key} />
                  <span className="text-[9px] text-foreground/60 tabular-nums">{r.date}</span>
                </button>
              ))}
            </div>
            {habitSel && (() => {
              const r = habitRows.find((x) => x.key === habitSel)!;
              return (
                <div className="mt-4 pt-3 border-t border-foreground/10 animate-fade-up text-sm">
                  <p className="font-display text-base">{r.date} — {r.done}/{r.total}</p>
                  {r.skipped.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[10px] uppercase tracking-wider text-foreground/55 mb-1">Skipped</p>
                      {r.skipped.map((s, i) => (
                        <p key={i} className="text-xs text-foreground/75">— {s.name}{s.reason ? <span className="italic text-foreground/50"> ({s.reason})</span> : ""}</p>
                      ))}
                    </div>
                  )}
                  {r.notLogged.length > 0 && (
                    <p className="text-[11px] text-foreground/50 italic mt-2">Not logged: {r.notLogged.join(", ")}</p>
                  )}
                </div>
              );
            })()}
          </div>
        </section>

        {/* Study chart */}
        <section>
          <header className="flex items-baseline justify-between px-1 mb-3 mt-2">
            <h2 className="font-display text-2xl tracking-tight">Study</h2>
            <div className="flex gap-1 bg-foreground/5 rounded-full p-1">
              <button onClick={() => setStudyRange(7)} className={`px-3 py-1 rounded-full text-xs press transition ${studyRange === 7 ? "bg-foreground text-background" : ""}`}>7d</button>
              <button onClick={() => setStudyRange(30)} className={`px-3 py-1 rounded-full text-xs press transition ${studyRange === 30 ? "bg-foreground text-background" : ""}`}>30d</button>
            </div>
          </header>
          <div className="card-lavender rounded-[24px] p-5">
            <div className="flex items-end gap-1" style={{ height: 120 }}>
              {studyRows.map((r) => {
                const h = (r.hours / maxStudy) * 100;
                return (
                  <div key={r.key} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <div className="w-full flex items-end justify-center" style={{ height: 100 }}>
                      <div
                        className="w-full max-w-[14px] bg-foreground rounded-t transition-all duration-700"
                        style={{ height: `${Math.max(2, h)}%`, opacity: r.hours === 0 ? 0.2 : 1 }}
                        title={`${r.date}: ${r.hours}h`}
                      />
                    </div>
                    {studyRange === 7 && (
                      <span className="text-[8px] text-foreground/55 tabular-nums truncate">{r.date}</span>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-foreground/60 mt-3">
              Total: <span className="font-display text-foreground text-sm">{formatHM(studyRows.reduce((a, r) => a + r.min, 0))}</span>
            </p>
          </div>
        </section>

        {/* Time Tracker summary */}
        <section>
          <header className="flex items-baseline justify-between px-1 mb-3 mt-2">
            <h2 className="font-display text-2xl tracking-tight">Time</h2>
            <div className="flex gap-1 bg-foreground/5 rounded-full p-1">
              <button onClick={() => setTtRange(7)} className={`px-3 py-1 rounded-full text-xs press transition ${ttRange === 7 ? "bg-foreground text-background" : ""}`}>7d</button>
              <button onClick={() => setTtRange(30)} className={`px-3 py-1 rounded-full text-xs press transition ${ttRange === 30 ? "bg-foreground text-background" : ""}`}>30d</button>
            </div>
          </header>
          {ttAggregate.length === 0 ? (
            <div className="card-paper rounded-2xl py-6 text-center text-sm text-muted-foreground italic">No time tracked yet.</div>
          ) : (
            <div className="card-butter rounded-[24px] p-5 space-y-3">
              {ttAggregate.slice(0, 6).map((a) => (
                <div key={a.category}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-sm font-medium">{a.category}</span>
                    <span className="text-xs tabular-nums text-foreground/65">{formatHM(a.mins)}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-background/60 overflow-hidden">
                    <div className="h-full bg-foreground transition-all duration-700" style={{ width: `${(a.mins / ttMax) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* AI Insights */}
        <section>
          <header className="flex items-baseline justify-between px-1 mb-3 mt-2">
            <h2 className="font-display text-2xl tracking-tight">AI insights</h2>
          </header>
          <div className="card-sky rounded-[24px] p-5">
            <p className="text-sm text-foreground/70 mb-3">Akshay's weekly analysis — sent privately to Gemini.</p>
            <button
              onClick={runInsights}
              disabled={aiLoading}
              className="w-full rounded-full bg-foreground text-background py-2.5 text-sm press flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sparkles size={14} />
              {aiLoading ? "Thinking…" : "Get this week's insights"}
            </button>
            {aiError && (
              <div className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300 p-3 text-xs whitespace-pre-wrap break-words">
                <div className="font-semibold mb-1">AI Insights error</div>
                {aiError}
              </div>
            )}

            {aiResult && (
              <div className="mt-4 bg-background/70 rounded-2xl p-4 text-sm whitespace-pre-wrap leading-relaxed animate-fade-up">
                {aiResult}
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Donut({ pct, active }: { pct: number; active: boolean }) {
  const size = 36;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * Math.min(1, Math.max(0, pct));
  return (
    <svg width={size} height={size} className={active ? "ring-2 ring-foreground/40 rounded-full" : ""}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="currentColor" strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}
