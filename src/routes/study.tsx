import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { actions, useStore, useToday } from "@/lib/store";
import { istYesterdayKey, formatHM } from "@/lib/ist";
import { Plus, X, Check, BookOpen, Trash2 } from "lucide-react";

export const Route = createFileRoute("/study")({
  head: () => ({ meta: [{ title: "Study — LIFE" }] }),
  component: StudyPage,
});

const FEELINGS = [
  { v: "hard", e: "😫", l: "Hard" },
  { v: "okay", e: "😐", l: "Okay" },
  { v: "good", e: "🙂", l: "Good" },
] as const;

function parsePlanLines(raw: string): string[] {
  if (!raw.trim()) return [];
  return raw.split("\n").map((l) => l.replace(/^•\s*/, "").trim()).filter(Boolean);
}

function StudyPage() {
  const today = useToday();
  const yKey = istYesterdayKey();
  const yPlanRaw = useStore((s) => s.days[yKey]?.study.tomorrowPlan ?? "");
  const allDays = useStore((s) => s.days);

  // Carry over up to 3 unchecked from yesterday → today's plan checklist
  const yPlan = useMemo(() => parsePlanLines(yPlanRaw).slice(0, 3), [yPlanRaw]);
  const [planChecks, setPlanChecks] = useState<Record<number, boolean>>({});

  const [topic, setTopic] = useState("");
  const [hrs, setHrs] = useState("");
  const [mins, setMins] = useState("");
  const [feeling, setFeeling] = useState<"hard" | "okay" | "good" | "">("");

  const [plan, setPlan] = useState(today.study.tomorrowPlan ?? "");

  const pastSubjects = useMemo(() => {
    const set = new Set<string>();
    Object.values(allDays).forEach((d) => (d.study.sessions ?? []).forEach((s) => set.add(s.subject)));
    return Array.from(set).slice(0, 30);
  }, [allDays]);

  const logStudy = () => {
    const minutes = (parseInt(hrs || "0", 10) || 0) * 60 + (parseInt(mins || "0", 10) || 0);
    if (!topic.trim() || minutes <= 0) return;
    const now = new Date();
    const start = new Date(now.getTime() - minutes * 60000).toISOString();
    actions.addStudySession({
      subject: topic.trim(),
      startISO: start,
      endISO: now.toISOString(),
      durationMin: minutes,
      feeling: feeling || undefined,
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("daily:in-app-alert", {
        detail: { title: "Nicely done 🌿", body: `${formatHM(minutes)} of ${topic.trim()}` }
      }));
    }
    setTopic(""); setHrs(""); setMins(""); setFeeling("");
  };

  const todayTotal = (today.study.sessions ?? []).reduce((a, s) => a + s.durationMin, 0);

  return (
    <AppShell title="Study" subtitle="Gentle planning, no timers.">
      <div className="space-y-4 stagger">
        {/* Today's plan */}
        <div className="card-sage p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/60 mb-3">Today's plan</div>
          {yPlan.length === 0 ? (
            <p className="text-sm text-foreground/65 italic">Nothing carried over. Plan tomorrow below — it'll show here.</p>
          ) : (
            <div className="space-y-2">
              {yPlan.map((it, i) => {
                const checked = !!planChecks[i];
                return (
                  <button
                    key={i}
                    onClick={() => setPlanChecks((c) => ({ ...c, [i]: !c[i] }))}
                    className="w-full flex items-start gap-3 text-left press"
                  >
                    <span className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 transition ${checked ? "bg-sage-deep text-primary-foreground" : "bg-card/60 border border-foreground/20"}`}>
                      {checked && <Check size={13} className="animate-tick" />}
                    </span>
                    <span className={`text-[15px] ${checked ? "line-through text-foreground/50" : ""}`}>{it}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Log session */}
        <div className="card-paper p-5">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={14} className="text-sage" />
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Log a session</span>
          </div>
          <input
            list="study-subjects"
            value={topic} onChange={(e) => setTopic(e.target.value)}
            placeholder="Subject (e.g. Polity, English…)"
            className="w-full rounded-full bg-muted px-4 py-2.5 text-sm outline-none placeholder:text-foreground/40 mb-2"
          />
          <datalist id="study-subjects">
            {pastSubjects.map((s) => <option key={s} value={s} />)}
          </datalist>
          <div className="flex gap-2 items-center mb-2">
            <input
              value={hrs} onChange={(e) => setHrs(e.target.value.replace(/\D/g, ""))}
              placeholder="0" inputMode="numeric"
              className="w-16 rounded-full bg-muted px-3 py-2 text-sm outline-none text-center tabular-nums"
            />
            <span className="text-xs text-muted-foreground">hr</span>
            <input
              value={mins} onChange={(e) => setMins(e.target.value.replace(/\D/g, ""))}
              placeholder="0" inputMode="numeric"
              className="w-16 rounded-full bg-muted px-3 py-2 text-sm outline-none text-center tabular-nums"
            />
            <span className="text-xs text-muted-foreground">min</span>
            <button
              onClick={logStudy}
              className="ml-auto rounded-full bg-sage-deep text-primary-foreground px-4 py-2 text-sm font-medium press flex items-center gap-1"
            ><Plus size={13} /> Log</button>
          </div>
          <div className="flex gap-2">
            {FEELINGS.map((f) => (
              <button
                key={f.v}
                onClick={() => setFeeling(feeling === f.v ? "" : f.v as any)}
                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs press ${feeling === f.v ? "bg-lavender text-[#1A1C1A]" : "bg-muted text-foreground/70"}`}
              >
                <span>{f.e}</span> {f.l}
              </button>
            ))}
          </div>
        </div>

        {/* Today total */}
        {todayTotal > 0 && (
          <div className="card-cream p-4 flex items-baseline justify-between">
            <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/55">Today's total</div>
            <div className="font-display text-2xl">{formatHM(todayTotal)}</div>
          </div>
        )}

        {/* Sessions list */}
        {(today.study.sessions?.length ?? 0) > 0 && (
          <div className="card-paper p-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Sessions</div>
            <div className="space-y-2 stagger">
              {today.study.sessions.map((s) => (
                <div key={s.id} className="flex items-center gap-3 bg-muted rounded-2xl px-3 py-2">
                  <span className="text-sm font-medium truncate flex-1">{s.subject}</span>
                  <span className="text-xs tabular-nums text-foreground/70">{formatHM(s.durationMin)}</span>
                  <button onClick={() => actions.removeStudySession(s.id)} className="text-foreground/35 hover:text-foreground transition">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tomorrow's plan */}
        <div className="card-lavender p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/55 mb-2">Tomorrow's plan</div>
          <textarea
            value={plan} onChange={(e) => setPlan(e.target.value)}
            onBlur={() => actions.setStudy({ tomorrowPlan: plan })}
            rows={3}
            placeholder="One item per line. Top 3 carry into tomorrow."
            className="w-full rounded-2xl bg-card/70 p-3 text-sm outline-none resize-none placeholder:text-foreground/40"
          />
          <p className="text-[11px] text-foreground/55 italic mt-2">Anything beyond 3 quietly archives — keeping it light.</p>
        </div>
      </div>
    </AppShell>
  );
}
