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

  const last7 = useMemo(() => lastNDays(7), []);

  const habitRows = useMemo(() => last7.slice().reverse().map((k) => {
    const d = days[k];
    const done = habits.filter((h) => d?.habits[h.id]?.done);
    const missed = habits.filter((h) => d?.habits[h.id] && !d.habits[h.id].done)
      .map((h) => ({ name: h.name, reason: d!.habits[h.id].reason }));
    return { key: k, date: formatISTDate(k), done: done.map((h) => h.name), missed };
  }), [days, habits, last7]);

  const studyRows = useMemo(() => last7.slice().reverse().map((k) => {
    const d = days[k];
    const min = studyMinutesFor(d);
    const topics = Array.from(new Set((d?.study.sessions ?? []).map((s) => s.subject))).slice(0, 3).join(", ");
    const reason = d?.study.notStudiedReason;
    return { key: k, date: formatISTDate(k), min, topics, reason };
  }), [days, last7]);

  // Consistency % — habits-logged days out of last 7
  const consistencyPct = useMemo(() => {
    if (habits.length === 0) return 0;
    let totalSlots = 0, doneSlots = 0;
    for (const k of last7) {
      const d = days[k];
      for (const h of habits) {
        totalSlots++;
        if (d?.habits[h.id]?.done) doneSlots++;
      }
    }
    return totalSlots ? Math.round((doneSlots / totalSlots) * 100) : 0;
  }, [days, habits, last7]);

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
      console.log("[AI Insights] VITE_GEMINI_API_KEY present:", !!apiKey, "length:", apiKey?.length ?? 0);
      if (!apiKey || apiKey.trim() === "") {
        setAiError("VITE_GEMINI_API_KEY is missing. Add it in Vercel → Project → Settings → Environment Variables, then redeploy.");
        setAiLoading(false);
        return;
      }

      const summary = last7.map((k) => {
        const d = days[k];
        if (!d) return { date: k, empty: true };
        return {
          date: k,
          studyMinutes: studyMinutesFor(d),
          sessions: (d.study.sessions ?? []).map((s) => ({ subject: s.subject, min: s.durationMin })),
          habitsDone: habits.filter((h) => d.habits[h.id]?.done).map((h) => h.name),
          habitsMissed: habits.filter((h) => d.habits[h.id] && !d.habits[h.id].done).map((h) => ({ name: h.name, reason: d.habits[h.id].reason })),
          toughDay: !!d.toughDay,
        };
      });

      const prompt = `You are a gentle, honest life coach for a student named Akshay who has OCD, sleep apnea and anxiety. Analyze this weekly data and give 3-4 short insights in simple Hindi+English mixed language. Be encouraging, never shame. Data: ${JSON.stringify(summary)}`;

      const callModel = async (model: string) => fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );

      let res = await callModel("gemini-2.0-flash");
      if (!res.ok) {
        console.warn("[AI Insights] gemini-2.0-flash failed, trying gemini-1.5-flash-latest");
        res = await callModel("gemini-1.5-flash-latest");
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
        {/* Habits per day */}
        {/* Consistency % */}
        <div className="card-amber p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/60 mb-1">Consistency · last 7 days</div>
          <div className="flex items-baseline gap-2">
            <div className="font-display text-5xl leading-none">{consistencyPct}<span className="text-2xl text-foreground/60">%</span></div>
            <div className="text-xs text-foreground/65 ml-2">
              {consistencyPct >= 80 ? "Beautiful rhythm 🌱" : consistencyPct >= 50 ? "Steady progress ✨" : "Every day counts 🌿"}
            </div>
          </div>
        </div>

        <section>
          <header className="flex items-baseline justify-between px-1 mb-3 mt-2">
            <h2 className="font-display text-2xl tracking-tight">Habits</h2>
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">last 7</span>
          </header>
          <div className="space-y-2 stagger">
            {habitRows.map((r) => (
              <div key={r.key} className="card-paper p-4">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="font-display text-base">{r.date}</span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">{r.done.length} done · {r.missed.length} missed</span>
                </div>
                {r.done.length === 0 && r.missed.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nothing logged.</p>
                ) : (
                  <div className="space-y-1">
                    {r.done.map((n, i) => (
                      <p key={"d" + i} className="text-xs text-foreground/85"><span className="text-amber font-semibold">✓</span> {n}</p>
                    ))}
                    {r.missed.map((m, i) => (
                      <p key={"m" + i} className="text-xs text-foreground/75"><span className="text-destructive font-semibold">✗</span> {m.name}{m.reason ? <span className="italic text-foreground/55"> — {m.reason}</span> : ""}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Study per day */}
        <section>
          <header className="flex items-baseline justify-between px-1 mb-3 mt-2">
            <h2 className="font-display text-2xl tracking-tight">Study</h2>
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">last 7</span>
          </header>
          <div className="space-y-2 stagger">
            {studyRows.map((r) => (
              <div key={r.key} className="card-paper p-3 flex items-center gap-3">
                <span className="text-xs tabular-nums w-14 text-muted-foreground">{r.date}</span>
                {r.min > 0 ? (
                  <>
                    <span className="flex-1 text-sm">Studied {r.topics && <span className="text-foreground/65">({r.topics})</span>}</span>
                    <span className="text-xs tabular-nums text-amber font-semibold">{formatHM(r.min)}</span>
                  </>
                ) : (
                  <span className="flex-1 text-sm text-muted-foreground italic">
                    Not studied{r.reason ? ` — ${r.reason}` : ""}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* AI Insights */}
        <section>
          <header className="flex items-baseline justify-between px-1 mb-3 mt-2">
            <h2 className="font-display text-2xl tracking-tight">AI insights</h2>
          </header>
          <div className="card-amber p-5">
            <p className="text-sm text-foreground/75 mb-3">Akshay's weekly analysis — last 7 days of habits + study sent privately to Gemini.</p>
            <button
              onClick={runInsights}
              disabled={aiLoading}
              className="w-full rounded-full bg-foreground text-background py-2.5 text-sm press flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sparkles size={14} />
              {aiLoading ? "Thinking…" : "Get Akshay's weekly analysis"}
            </button>
            {aiError && (
              <div className="mt-3 rounded-2xl border border-destructive/40 bg-destructive/10 text-destructive p-3 text-xs whitespace-pre-wrap break-words">
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
