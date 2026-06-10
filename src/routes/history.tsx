import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStore, studyMinutesFor, actions } from "@/lib/store";
import { formatISTDate, lastNDays, formatHM } from "@/lib/ist";
import { Sparkles, Key, ChevronDown, ChevronUp } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { StatsBars, AkshayAvatar } from "@/components/illustrations";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: [{ title: "Stats — daily." }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const habits = useStore((s) => s.habits);
  const days = useStore((s) => s.days);

  const [studyRange, setStudyRange] = useState<7 | 30>(7);

  const last7 = useMemo(() => lastNDays(7), []);
  const studyDays = useMemo(() => lastNDays(studyRange), [studyRange]);

  // ===== Habits grid (rows = habit, columns = last 7 days, oldest → newest) =====
  const habitGridDays = useMemo(() => last7.slice().reverse(), [last7]); // oldest first
  const dayShort = (k: string) => {
    // k = "YYYY-MM-DD"
    const [, , d] = k.split("-");
    return d;
  };

  // Completion % per habit over last 7 days
  const habitPct = (habitId: string) => {
    let done = 0;
    for (const k of last7) if (days[k]?.habits[habitId]?.done) done++;
    return Math.round((done / 7) * 100);
  };

  // Consistency %
  const consistencyPct = useMemo(() => {
    if (habits.length === 0) return 0;
    let totalSlots = 0, doneSlots = 0;
    for (const k of last7) {
      for (const h of habits) {
        totalSlots++;
        if (days[k]?.habits[h.id]?.done) doneSlots++;
      }
    }
    return totalSlots ? Math.round((doneSlots / totalSlots) * 100) : 0;
  }, [days, habits, last7]);

  // ===== Study bar chart data =====
  const studyBars = useMemo(() => {
    return studyDays.slice().reverse().map((k) => {
      const d = days[k];
      const min = studyMinutesFor(d);
      const hours = +(min / 60).toFixed(2);
      const topics = Array.from(new Set((d?.study.sessions ?? []).map((s) => s.subject)));
      const topic = topics[0] ?? "";
      const [, m, day] = k.split("-");
      const label = `${day}/${m}`;
      return { key: k, hours, min, topic, label };
    });
  }, [days, studyDays]);

  const maxHours = Math.max(1, ...studyBars.map((b) => b.hours));

  // ===== AI Insights =====
  const savedApiKey = useStore((s) => s.settings?.geminiApiKey ?? "");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyDraft, setKeyDraft] = useState("");

  const runInsights = async () => {
    setAiLoading(true); setAiError(null); setAiResult(null);
    try {
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

      const prompt = `You are a gentle, honest life coach for a student named Akshay who has OCD, sleep apnea and anxiety. Analyze this weekly data and give 3-4 short insights in simple Hindi+English (Hinglish) mixed language. Be warm, encouraging, never shame. Keep it personal and specific to the data. Data: ${JSON.stringify(summary)}`;

      let resultText = "";

      if (savedApiKey) {
        // Use Gemini when API key is saved — best quality.
        const MODELS = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
        let geminiRes: Response | null = null;
        let lastErr = "";
        for (const model of MODELS) {
          geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${savedApiKey}`,
            { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
          );
          if (geminiRes.ok) break;
          const et = await geminiRes.text();
          lastErr = `Gemini ${geminiRes.status} (${model}): ${et.slice(0, 150)}`;
          geminiRes = null;
        }
        if (geminiRes) {
          const json = await geminiRes.json();
          resultText = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        } else {
          throw new Error(lastErr || "Gemini failed. Check your API key.");
        }
      } else {
        // Pollinations.ai fallback — free, no key needed.
        const res = await fetch("https://text.pollinations.ai/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              { role: "system", content: "You are a gentle, encouraging life coach who speaks in Hinglish (Hindi + English mix). Be warm, specific, never shame. Give 3-4 bullet insights." },
              { role: "user", content: prompt },
            ],
            model: "openai",
            seed: 42,
            private: true,
          }),
        });
        if (!res.ok) { const t = await res.text(); throw new Error(`AI error ${res.status}: ${t.slice(0, 150)}`); }
        resultText = await res.text();
      }

      if (!resultText.trim()) throw new Error("No insights returned. Try again.");
      setAiResult(resultText.trim());
    } catch (e: any) {
      setAiError(e?.message ?? "Something went wrong. Try again later.");
    } finally { setAiLoading(false); }
  };


  return (
    <AppShell title="Stats">
      <div className="space-y-4 stagger">
        <div className="flex justify-center -mt-2 mb-1"><StatsBars className="h-20 w-20" /></div>
        {/* Consistency */}
        <div className="card-amber p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/60 mb-1">Consistency · last 7 days</div>
          <div className="flex items-baseline gap-2">
            <div className="font-display text-5xl leading-none">{consistencyPct}<span className="text-2xl text-foreground/60">%</span></div>
            <div className="text-xs text-foreground/65 ml-2">
              {consistencyPct >= 80 ? "Beautiful rhythm 🌱" : consistencyPct >= 50 ? "Steady progress ✨" : "Every day counts 🌿"}
            </div>
          </div>
        </div>

        {/* Habits grid */}
        <section>
          <header className="flex items-baseline justify-between px-1 mb-3 mt-2">
            <h2 className="font-display text-2xl tracking-tight">Habits</h2>
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">last 7</span>
          </header>
          <div className="card-paper p-4">
            {habits.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No habits yet.</p>
            ) : (
              <div className="space-y-3">
                {/* Column headers */}
                <div className="grid items-center gap-2" style={{ gridTemplateColumns: "minmax(0,1fr) repeat(7, 22px) 44px" }}>
                  <div />
                  {habitGridDays.map((k) => (
                    <div key={k} className="text-[10px] text-center text-muted-foreground tabular-nums">{dayShort(k)}</div>
                  ))}
                  <div className="text-[10px] text-right text-muted-foreground">%</div>
                </div>
                {/* Rows */}
                {habits.map((h) => {
                  const pct = habitPct(h.id);
                  return (
                    <div key={h.id} className="grid items-center gap-2" style={{ gridTemplateColumns: "minmax(0,1fr) repeat(7, 22px) 44px" }}>
                      <div className="text-sm truncate pr-2">{h.name}</div>
                      {habitGridDays.map((k) => {
                        const log = days[k]?.habits[h.id];
                        if (!log) {
                          return <div key={k} className="mx-auto h-3 w-3 rounded-full bg-foreground/15" title="not logged" />;
                        }
                        if (log.done) {
                          return <div key={k} className="mx-auto h-3 w-3 rounded-full bg-emerald-500" title="done" />;
                        }
                        return (
                          <Popover key={k}>
                            <PopoverTrigger asChild>
                              <button className="mx-auto h-3 w-3 rounded-full bg-red-500 press" aria-label="missed — tap for reason" />
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-3">
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{formatISTDate(k)}</div>
                              <div className="text-sm font-medium mb-1">{h.name} · missed</div>
                              <div className="text-xs text-foreground/75">{log.reason ? log.reason : <span className="italic text-foreground/55">No reason noted.</span>}</div>
                            </PopoverContent>
                          </Popover>
                        );
                      })}
                      <div className="text-[11px] text-right tabular-nums text-amber font-semibold">{pct}%</div>
                    </div>
                  );
                })}
                {/* Legend */}
                <div className="flex items-center gap-3 pt-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> done</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> missed</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-foreground/15" /> not logged</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Study bar chart */}
        <section>
          <header className="flex items-baseline justify-between px-1 mb-3 mt-2">
            <h2 className="font-display text-2xl tracking-tight">Study</h2>
            <div className="inline-flex rounded-full bg-foreground/5 p-0.5 text-[11px]">
              <button onClick={() => setStudyRange(7)} className={`px-2.5 py-1 rounded-full ${studyRange === 7 ? "bg-foreground text-background" : "text-muted-foreground"}`}>7d</button>
              <button onClick={() => setStudyRange(30)} className={`px-2.5 py-1 rounded-full ${studyRange === 30 ? "bg-foreground text-background" : "text-muted-foreground"}`}>30d</button>
            </div>
          </header>
          <div className="card-paper p-4">
            <div className="flex items-end gap-1.5 h-40">
              {studyBars.map((b) => {
                const isRest = b.min === 0;
                const h = isRest ? 4 : Math.max(6, Math.round((b.hours / maxHours) * 140));
                return (
                  <div key={b.key} className="flex-1 flex flex-col items-center justify-end min-w-0">
                    {!isRest && (
                      <div className="text-[9px] tabular-nums text-amber font-semibold mb-1">{b.hours}h</div>
                    )}
                    <div
                      className={`w-full rounded-t-md ${isRest ? "bg-foreground/10" : "bg-amber"}`}
                      style={{ height: `${h}px` }}
                      title={isRest ? "Rest" : `${formatHM(b.min)}${b.topic ? " · " + b.topic : ""}`}
                    />
                  </div>
                );
              })}
            </div>
            {/* X axis labels: date + topic / Rest */}
            <div className="flex gap-1.5 mt-2">
              {studyBars.map((b) => (
                <div key={b.key} className="flex-1 min-w-0 text-center">
                  <div className="text-[9px] tabular-nums text-muted-foreground">{b.label}</div>
                  <div className="text-[9px] truncate text-foreground/70">{b.min === 0 ? "Rest" : (b.topic || "—")}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AI Insights */}
        <section>
          <header className="flex items-baseline justify-between px-1 mb-3 mt-2">
            <h2 className="font-display text-2xl tracking-tight">AI insights</h2>
          </header>
          <div className="card-amber p-5">
            <div className="flex items-center gap-3 mb-3">
              <AkshayAvatar size={44} />
              <div className="flex-1">
                <p className="text-sm text-foreground/75">Akshay's weekly analysis — last 7 days of habits + study.</p>
                <p className="text-[10px] text-foreground/50 mt-0.5">
                  {savedApiKey ? "⚡ Using Gemini AI (your key)" : "🆓 Using free AI (Pollinations)"}
                </p>
              </div>
            </div>

            {/* Gemini key toggle */}
            <button
              onClick={() => { setShowKeyInput(!showKeyInput); setKeyDraft(savedApiKey); }}
              className="flex items-center gap-1.5 text-[11px] text-foreground/55 mb-3 press"
            >
              <Key size={11} />
              {savedApiKey ? "Change Gemini API key" : "Add Gemini API key (optional, better quality)"}
              {showKeyInput ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>

            {showKeyInput && (
              <div className="mb-3 space-y-2 animate-fade-up">
                <input
                  type="password"
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  placeholder="Paste your Gemini API key here…"
                  className="w-full rounded-full bg-background/70 px-4 py-2 text-xs outline-none placeholder:text-foreground/40 font-mono"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { actions.setGeminiKey(keyDraft); setShowKeyInput(false); }}
                    className="flex-1 rounded-full bg-foreground text-background py-1.5 text-xs press"
                  >
                    Save key
                  </button>
                  {savedApiKey && (
                    <button
                      onClick={() => { actions.setGeminiKey(""); setKeyDraft(""); setShowKeyInput(false); }}
                      className="flex-1 rounded-full bg-muted text-foreground/60 py-1.5 text-xs press"
                    >
                      Remove key
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-foreground/40 px-1">Key is saved only on this device. Get a free key at aistudio.google.com</p>
              </div>
            )}

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
