import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { actions, useStore, LIFE_START_KEY, type MemoryItem } from "@/lib/store";
import { buildTimeline, type TimelineKind, type TimelineItem } from "@/lib/timeline";
import { monthlySummary } from "@/lib/garden";
import { formatISTDate, istDateKey } from "@/lib/ist";
import { Sparkles, WifiOff, Shuffle, Pencil, Trash2, Check, X } from "lucide-react";

export const Route = createFileRoute("/timeline")({
  head: () => ({ meta: [{ title: "Timeline — LIFE" }] }),
  component: TimelinePage,
});

const FILTERS: { v: TimelineKind | "all"; label: string }[] = [
  { v: "all", label: "All" },
  { v: "forest", label: "Forest" },
  { v: "sleep", label: "Sleep" },
  { v: "habit", label: "Habits" },
  { v: "missed", label: "Missed" },
  { v: "task", label: "Tasks" },
  { v: "event", label: "Events" },
  { v: "win", label: "Wins" },
];

function TimelinePage() {
  const s = useStore((s) => s);
  const [filter, setFilter] = useState<TimelineKind | "all">("all");
  const timeline = useMemo(() => buildTimeline(s), [s]);
  const summary = useMemo(() => monthlySummary(), [s.days, s.memoryJar, s.habits]);

  const orderedDates = useMemo(() => Object.keys(timeline).sort((a, b) => b.localeCompare(a)), [timeline]);
  const matches = (it: TimelineItem) => filter === "all" || it.kind === filter;

  return (
    <AppShell title="Timeline" subtitle="A gentle record of your days.">
      <div className="space-y-5 stagger">
        {/* Monthly summary */}
        <div className="card-sage p-7">
          <div className="text-[11px] uppercase tracking-[0.24em] text-foreground/60">This month</div>
          <p className="font-display text-[26px] tracking-tight mt-1">{summary.label}</p>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <SummaryRow emoji="🌳" label="Full forest days" value={String(summary.fullDays)} />
            <SummaryRow emoji="😴" label="Avg sleep" value={summary.avgSleepMinutes ? formatHM(summary.avgSleepMinutes) : "—"} />
            <SummaryRow emoji="🏆" label="Wins" value={String(summary.wins)} />
            <SummaryRow emoji="✅" label="Tasks done" value={String(summary.tasksCompleted)} />
          </div>
        </div>

        {/* Memory Jar */}
        <MemoryJarCard />

        {/* AI Reflections */}
        <AIReflectionsCard />

        {/* Filters (no search) */}
        <div className="card-paper p-3">
          <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1">
            {FILTERS.map((f) => (
              <button
                key={f.v}
                onClick={() => setFilter(f.v)}
                className={`text-[11px] rounded-full px-3 py-1 shrink-0 press ${filter === f.v ? "bg-sage text-[#1A1C1A]" : "bg-muted text-foreground/70"}`}
              >{f.label}</button>
            ))}
          </div>
        </div>

        {/* Feed */}
        <div className="space-y-4">
          {orderedDates.length === 0 && (
            <div className="card-sage p-8 text-center space-y-2">
              <div className="text-[34px]">🌱</div>
              {istDateKey() < LIFE_START_KEY ? (
                <>
                  <p className="font-display text-[20px] tracking-tight">Your LIFE journey begins on 15 June 2026.</p>
                  <p className="text-[14px] text-foreground/65 leading-relaxed">Your first habit, win, or sleep log will appear here once the journey begins.</p>
                </>
              ) : (
                <>
                  <p className="font-display text-[20px] tracking-tight">Your timeline is ready.</p>
                  <p className="text-[14px] text-foreground/65 leading-relaxed">Your first habit, win, or sleep log will appear here.</p>
                </>
              )}
            </div>
          )}
          {orderedDates.map((dk) => {
            const items = timeline[dk].filter(matches);
            if (!items.length) return null;
            return (
              <div key={dk} className="card-paper p-4">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">{formatISTDate(dk)}</div>
                <div className="space-y-1.5">
                  {items.map((it) => (
                    <div key={it.id} className="flex items-start gap-2.5 text-sm">
                      <span className="text-base leading-tight shrink-0">{it.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="leading-snug">{it.text}</p>
                        {it.detail && <p className="text-[11px] text-muted-foreground mt-0.5 break-words">{it.detail}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

function SummaryRow({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div className="bg-card/55 rounded-2xl p-4">
      <div className="text-[26px] leading-none">{emoji}</div>
      <div className="font-display text-[30px] leading-none mt-3">{value}</div>
      <div className="text-[12px] text-foreground/60 mt-1.5">{label}</div>
    </div>
  );
}

function MemoryJarCard() {
  const jar = useStore((s) => s.memoryJar ?? []);
  const [surprise, setSurprise] = useState<MemoryItem | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const pickRandom = () => {
    if (!jar.length) return;
    setSurprise(jar[Math.floor(Math.random() * jar.length)]);
  };

  return (
    <div className="card-cream p-6">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] uppercase tracking-[0.24em] text-foreground/55">Memory jar</div>
        <button
          onClick={pickRandom}
          disabled={!jar.length}
          className="rounded-full bg-card/70 px-3 py-1.5 text-[11px] press flex items-center gap-1 disabled:opacity-40"
        ><Shuffle size={11} /> Surprise me</button>
      </div>
      {surprise && (
        <div className="rounded-2xl bg-card/80 p-4 mb-3 animate-fade-up">
          <div className="text-[10px] uppercase tracking-wider text-foreground/55">{formatISTDate(surprise.dateKey)}</div>
          <p className="text-[15px] mt-1">{surprise.text}</p>
        </div>
      )}
      {jar.length === 0 ? (
        <p className="text-[13px] text-foreground/55 italic">Your wins land here. Log one on Today.</p>
      ) : (
        <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {jar.slice(0, 50).map((m) => (
            <li key={m.id} className="rounded-2xl bg-card/60 p-3">
              {editing === m.id ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="flex-1 rounded-full bg-card/80 px-3 py-1.5 text-[13px] outline-none"
                  />
                  <button onClick={() => { actions.updateMemory(m.id, draft); setEditing(null); }} className="text-sage-deep press"><Check size={14} /></button>
                  <button onClick={() => setEditing(null)} className="text-muted-foreground press"><X size={14} /></button>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-foreground/55">{formatISTDate(m.dateKey)}</div>
                    <p className="text-[14px] mt-0.5">{m.text}</p>
                  </div>
                  <button onClick={() => { setEditing(m.id); setDraft(m.text); }} className="text-foreground/40 hover:text-foreground press p-1"><Pencil size={12} /></button>
                  <button onClick={() => actions.removeMemory(m.id)} className="text-foreground/40 hover:text-destructive press p-1"><Trash2 size={12} /></button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AIReflectionsCard() {
  const s = useStore((s) => s);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const online = typeof navigator === "undefined" ? true : navigator.onLine;
  const envKey = (import.meta.env as any).VITE_GEMINI_API_KEY as string | undefined;
  const apiKey = envKey || s.settings?.geminiApiKey;

  const run = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const recentKeys = Object.keys(s.days).sort().slice(-7);
      const nn = s.habits.filter((h) => h.category === "non-negotiable");
      const recent = recentKeys.map((k) => {
        const d = s.days[k];
        const nnDone = nn.filter((h) => d.habits[h.id]?.done).length;
        return {
          date: k,
          sleptAt: d.sleep?.sleptAt,
          wokeAt: d.sleep?.wokeAt,
          nonNegotiables: `${nnDone}/${nn.length}`,
          habitsDone: Object.entries(d.habits).filter(([, v]) => v.done).length,
          tasksDone: d.tasksToday.filter((t) => t.done).length,
          win: d.study.win,
        };
      });
      const upcomingEvents = (s.events ?? []).filter((e) => e.date >= (recentKeys[0] ?? "")).slice(0, 5).map((e) => ({ date: e.date, name: e.name }));
      const prompt = `You are a gentle, warm life companion for Akshay (who has anxiety). Look at the last 7 days of sleep times, non-negotiable habit consistency, wins, tasks, and upcoming events. Give 3-5 short, supportive observations in plain English. NEVER criticize, shame, or compare. NEVER score productivity. Highlight forest growth and small wins. Be kind. Recent: ${JSON.stringify(recent)}. Upcoming: ${JSON.stringify(upcomingEvents)}`;

      let text = "";
      if (apiKey) {
        const MODELS = ["gemini-2.0-flash", "gemini-1.5-flash-latest"];
        for (const model of MODELS) {
          try {
            const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
            });
            if (r.ok) {
              const j = await r.json();
              text = j?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
              if (text) break;
            }
          } catch {}
        }
      }
      if (!text) {
        const r = await fetch("https://text.pollinations.ai/", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              { role: "system", content: "You are a gentle, warm life companion. Never shame. Plain English. 3-5 observations." },
              { role: "user", content: prompt },
            ], model: "openai", seed: 42, private: true,
          }),
        });
        if (r.ok) text = await r.text();
      }
      if (!text.trim()) throw new Error("Couldn't reach the AI right now. Try again in a moment.");
      setResult(text.trim());
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
    } finally { setLoading(false); }
  };

  return (
    <div className="card-lavender p-5">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={14} className="text-foreground/70" />
        <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/60">Reflections</div>
      </div>
      <p className="text-sm text-foreground/75 mb-3">A gentle look at your last 7 days — no scores, just observations.</p>
      <button
        onClick={run}
        disabled={loading || !online}
        className="w-full rounded-full bg-sage-deep text-primary-foreground py-2.5 text-sm font-medium press flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {!online ? <><WifiOff size={13} /> Needs internet</> : loading ? "Reflecting…" : "Reflect on my week"}
      </button>
      {error && <div className="mt-3 rounded-2xl bg-amber/15 p-3 text-xs text-foreground/80">{error}</div>}
      {result && (
        <div className="mt-3 bg-card/70 rounded-2xl p-4 text-sm whitespace-pre-wrap leading-relaxed animate-fade-up">
          {result}
        </div>
      )}
    </div>
  );
}
