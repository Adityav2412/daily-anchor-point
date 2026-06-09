import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { actions, useStore, useToday } from "@/lib/store";
import { istYesterdayKey, formatHM } from "@/lib/ist";
import { Plus, X, Check, BookOpen } from "lucide-react";

export const Route = createFileRoute("/study")({
  head: () => ({ meta: [{ title: "Study — daily." }] }),
  component: StudyPage,
});

// Parse plan lines: support backlog tag "📌"
function parsePlanLines(raw: string): { text: string; backlog: boolean }[] {
  if (!raw.trim()) return [];
  return raw
    .split("\n")
    .map((l) => l.replace(/^•\s*/, "").trim())
    .filter(Boolean)
    .map((l) => {
      const backlog = l.startsWith("📌");
      return { text: backlog ? l.replace(/^📌\s*/, "").trim() : l, backlog };
    });
}

function StudyPage() {
  const today = useToday();
  const yKey = istYesterdayKey();
  const yPlanRaw = useStore((s) => s.days[yKey]?.study.tomorrowPlan ?? "");
  const todayPlanRaw = today.study.tomorrowPlan ?? "";

  // Today's plan = yesterday's plan items, with backlog tag if they roll over
  const planItems = parsePlanLines(yPlanRaw);
  const checked = today.study.planStatus?.done === true;

  // Manual log
  const [topic, setTopic] = useState("");
  const [hrs, setHrs] = useState("");
  const [mins, setMins] = useState("");

  // Plan tomorrow textarea
  const [plan, setPlan] = useState(todayPlanRaw);

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
    });
    setTopic(""); setHrs(""); setMins("");
  };

  const todayTotal = (today.study.sessions ?? []).reduce((a, s) => a + s.durationMin, 0);

  return (
    <AppShell title="Study">
      <div className="space-y-4 stagger">
        {/* TODAY'S PLAN */}
        <div className="card-amber p-5 animate-fade-up">
          <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/60 mb-3">Today's plan</div>
          {planItems.length === 0 ? (
            <p className="text-sm text-foreground/60 italic">Nothing planned. Add a plan for tomorrow below.</p>
          ) : (
            <div className="space-y-2">
              {planItems.map((it, i) => (
                <div key={i} className="flex items-start gap-3">
                  <button
                    onClick={() => actions.setPlanStatus(checked ? undefined : { done: true })}
                    className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 press transition ${checked ? "bg-amber border-amber text-[#0A0A0A]" : "border-foreground/30"}`}
                  >{checked && <Check size={13} className="animate-tick" />}</button>
                  <div className="flex-1">
                    <p className={`text-[15px] ${checked ? "line-through text-foreground/50" : ""}`}>{it.text}</p>
                    {it.backlog && (
                      <span className="inline-block mt-1 text-[10px] uppercase tracking-wider bg-destructive/15 text-destructive px-2 py-0.5 rounded-full">📌 Backlog</span>
                    )}
                  </div>
                </div>
              ))}
              {!checked && (
                <p className="text-[11px] text-foreground/55 italic pt-1">If unchecked by midnight, this rolls to tomorrow as backlog.</p>
              )}
            </div>
          )}
        </div>

        {/* Manual log */}
        <div className="card-paper p-5">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={14} className="text-amber" />
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Log what you studied</span>
          </div>
          <input
            value={topic} onChange={(e) => setTopic(e.target.value)}
            placeholder="What did you study?"
            className="w-full rounded-full bg-muted px-4 py-2.5 text-sm outline-none placeholder:text-foreground/40 mb-2"
          />
          <div className="flex gap-2 items-center">
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
              className="ml-auto rounded-full bg-amber text-[#0A0A0A] px-4 py-2 text-sm font-medium press flex items-center gap-1"
            ><Plus size={13} /> Add</button>
          </div>
        </div>

        {/* Today's sessions */}
        {(today.study.sessions?.length ?? 0) > 0 && (
          <div className="card-paper p-5">
            <div className="flex items-baseline justify-between mb-3">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Today's sessions</div>
              <span className="text-xs tabular-nums text-foreground/70">Total {formatHM(todayTotal)}</span>
            </div>
            <div className="space-y-2 stagger">
              {today.study.sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm bg-muted rounded-2xl px-4 py-2.5">
                  <span className="font-medium truncate flex-1">{s.subject}</span>
                  <span className="text-xs tabular-nums text-muted-foreground mr-3">{formatHM(s.durationMin)}</span>
                  <button onClick={() => actions.removeStudySession(s.id)} className="text-foreground/30 hover:text-foreground transition"><X size={12} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Plan for tomorrow */}
        <div className="card-mint p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/60 mb-2">Plan for tomorrow</div>
          <textarea
            value={plan} onChange={(e) => setPlan(e.target.value)}
            onBlur={() => actions.setStudy({ tomorrowPlan: plan })}
            rows={3}
            placeholder="One item per line. Shows as Today's Plan tomorrow."
            className="w-full rounded-2xl bg-background/70 p-3 text-sm outline-none resize-none placeholder:text-foreground/40"
          />
        </div>
      </div>
    </AppShell>
  );
}
