import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { buildTimeline, type TimelineKind, type TimelineItem } from "@/lib/timeline";
import { monthlySummary } from "@/lib/garden";
import { formatISTDate } from "@/lib/ist";
import { Search, Sparkles, WifiOff } from "lucide-react";

export const Route = createFileRoute("/timeline")({
  head: () => ({ meta: [{ title: "Timeline — LIFE" }] }),
  component: TimelinePage,
});

const FILTERS: { v: TimelineKind | "all"; label: string }[] = [
  { v: "all", label: "All" },
  { v: "mood", label: "Mood" },
  { v: "habit", label: "Habits" },
  { v: "study", label: "Study" },
  { v: "task", label: "Tasks" },
  { v: "journal", label: "Journal" },
  { v: "event", label: "Events" },
  { v: "win", label: "Wins" },
];

function TimelinePage() {
  const s = useStore((s) => s);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TimelineKind | "all">("all");
  const timeline = useMemo(() => buildTimeline(s), [s]);
  const summary = useMemo(() => monthlySummary(), [s.days, s.memoryJar]);

  const orderedDates = useMemo(() => Object.keys(timeline).sort((a, b) => b.localeCompare(a)), [timeline]);

  const matches = (it: TimelineItem) => {
    if (filter !== "all" && it.kind !== filter) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return it.text.toLowerCase().includes(q) || (it.detail?.toLowerCase().includes(q) ?? false);
  };

  return (
    <AppShell title="Timeline" subtitle="A gentle record of your days.">
      <div className="space-y-5 stagger">
        {/* Monthly summary */}
        <div className="card-sage p-7">
          <div className="text-[11px] uppercase tracking-[0.24em] text-foreground/60">This month</div>
          <p className="font-display text-[26px] tracking-tight mt-1">{summary.label}</p>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <SummaryRow emoji="🙂" label="Good mood days" value={String(summary.goodDays)} />
            <SummaryRow emoji="📚" label="Study time" value={`${summary.studyHours}h`} />
            <SummaryRow emoji="🏆" label="Wins" value={String(summary.wins)} />
            <SummaryRow emoji="🌱" label="Garden growth" value={summary.growth ? `+${summary.growth}` : "—"} />
          </div>
        </div>

        {/* AI Reflections */}
        <AIReflectionsCard />

        {/* Search + filters */}
        <div className="card-paper p-3 space-y-2">
          <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-2">
            <Search size={14} className="text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your timeline…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-foreground/40"
            />
          </div>
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
              <p className="font-display text-[20px] tracking-tight">Your story starts today.</p>
              <p className="text-[14px] text-foreground/65 leading-relaxed">Check in, log a win, or write a journal entry — it'll show up here.</p>
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
      const recent = Object.keys(s.days).sort().slice(-7).map((k) => {
        const d = s.days[k];
        return {
          date: k,
          mood: d.mood,
          energy: d.energy,
          focus: d.focus,
          habitsDone: Object.entries(d.habits).filter(([, v]) => v.done).length,
          studyMin: (d.study.sessions ?? []).reduce((a, x) => a + x.durationMin, 0),
          win: d.study.win,
          journal: d.journal,
        };
      });
      const prompt = `You are a gentle, warm life companion for Akshay (who has anxiety). Look at the last 7 days and give 3-5 short, supportive observations in plain English. NEVER criticize, shame, or compare. Highlight small wins. Be kind. Data: ${JSON.stringify(recent)}`;

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
