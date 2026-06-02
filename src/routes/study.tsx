import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { actions, useStore, useToday } from "@/lib/store";
import { istYesterdayKey, formatClock, formatHM } from "@/lib/ist";
import { Pause, Play, X } from "lucide-react";

export const Route = createFileRoute("/study")({
  head: () => ({ meta: [{ title: "Study — daily." }] }),
  component: StudyPage,
});

function StudyPage() {
  const today = useToday();
  const yKey = istYesterdayKey();
  const yPlan = useStore((s) => s.days[yKey]?.study.tomorrowPlan ?? "");
  const planStatus = today.study.planStatus;
  const hasPlan = yPlan.trim().length > 0;

  const [reason, setReason] = useState(today.study.notStudiedReason ?? "");
  const [plan, setPlan] = useState(today.study.tomorrowPlan ?? "");
  const [skipReasonOpen, setSkipReasonOpen] = useState(false);
  const [skipReason, setSkipReason] = useState(planStatus?.reason ?? "");

  // Timer
  const [running, setRunning] = useState(false);
  const [startISO, setStartISO] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [askSubject, setAskSubject] = useState<{ startISO: string; endISO: string; durationMin: number } | null>(null);
  const [subjectDraft, setSubjectDraft] = useState("");
  const intRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running || !startISO) return;
    intRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(startISO).getTime()) / 1000));
    }, 1000);
    return () => { if (intRef.current) clearInterval(intRef.current); };
  }, [running, startISO]);

  const start = () => {
    const iso = new Date().toISOString();
    setStartISO(iso);
    setElapsed(0);
    setRunning(true);
  };
  const stop = () => {
    if (!startISO) return;
    setRunning(false);
    const endISO = new Date().toISOString();
    const durationMin = Math.max(1, Math.round((new Date(endISO).getTime() - new Date(startISO).getTime()) / 60000));
    setAskSubject({ startISO, endISO, durationMin });
    setSubjectDraft("");
    setStartISO(null);
    setElapsed(0);
  };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  const studiedYes = today.study.studiedToday === true;
  const studiedNo = today.study.studiedToday === false;

  return (
    <AppShell title="Study">
      <div className="space-y-4 stagger">
        {/* Today's plan from yesterday */}
        {hasPlan && (
          <div className="card-mint rounded-[24px] p-5 animate-fade-up">
            <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/60 mb-2">Today's plan</div>
            <p className="font-display text-lg tracking-tight mb-3">{yPlan}</p>

            {!planStatus ? (
              <div className="flex gap-2">
                <button
                  onClick={() => actions.setPlanStatus({ done: true })}
                  className="flex-1 rounded-full bg-foreground text-background py-2 text-sm press flex items-center justify-center gap-2"
                >✓ Done</button>
                <button
                  onClick={() => setSkipReasonOpen(true)}
                  className="flex-1 rounded-full bg-background/70 py-2 text-sm press flex items-center justify-center gap-2"
                >✗ Not yet</button>
              </div>
            ) : planStatus.done ? (
              <div className="flex items-center justify-between text-sm text-foreground/70">
                <span>✓ Done — nice.</span>
                <button onClick={() => actions.setPlanStatus(undefined)} className="text-[11px] underline text-foreground/50">Undo</button>
              </div>
            ) : (
              <div className="text-sm text-foreground/70">
                <p>Noted{planStatus.reason ? `: "${planStatus.reason}"` : ""}.</p>
                <button onClick={() => actions.setPlanStatus(undefined)} className="text-[11px] underline text-foreground/50 mt-1">Undo</button>
              </div>
            )}

            {skipReasonOpen && !planStatus && (
              <div className="mt-3 animate-fade-up">
                <input
                  value={skipReason} onChange={(e) => setSkipReason(e.target.value)}
                  placeholder="Why not? (just a note)"
                  className="w-full rounded-full bg-background/70 px-4 py-2 text-xs outline-none placeholder:text-foreground/40"
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={() => { setSkipReasonOpen(false); setSkipReason(""); }} className="flex-1 rounded-full bg-background/70 py-1.5 text-xs press">Cancel</button>
                  <button onClick={() => { actions.setPlanStatus({ done: false, reason: skipReason.trim() || undefined }); setSkipReasonOpen(false); }} className="flex-1 rounded-full bg-foreground text-background py-1.5 text-xs press">Save</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Studied today? */}
        <div className="card-paper rounded-[24px] p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">Studied today?</div>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => actions.setStudy({ studiedToday: true, notStudiedReason: undefined })}
              className={`flex-1 rounded-full py-2.5 text-sm font-semibold press transition ${studiedYes ? "bg-foreground text-background" : "bg-muted"}`}
            >Yes</button>
            <button
              onClick={() => actions.setStudy({ studiedToday: false })}
              className={`flex-1 rounded-full py-2.5 text-sm font-semibold press transition ${studiedNo ? "bg-foreground text-background" : "bg-muted"}`}
            >Not today</button>
          </div>
          {studiedNo && (
            <input
              value={reason} onChange={(e) => setReason(e.target.value)}
              onBlur={() => actions.setStudy({ notStudiedReason: reason })}
              placeholder="What happened? (just a note)"
              className="w-full rounded-full bg-muted px-4 py-2 text-xs outline-none placeholder:text-foreground/40 animate-fade-up"
            />
          )}
        </div>

        {/* Timer (only if YES) */}
        {studiedYes && (
          <div className="card-peach rounded-[24px] p-5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/60 mb-3">Session timer</div>
            <div className="flex items-center justify-between">
              <div className="font-display text-5xl tabular-nums leading-none">{mm}:{ss}</div>
              {!running ? (
                <button onClick={start} className="h-12 px-5 rounded-full bg-foreground text-background flex items-center gap-2 press">
                  <Play size={16} /> Start
                </button>
              ) : (
                <button onClick={stop} className="h-12 px-5 rounded-full bg-foreground text-background flex items-center gap-2 press">
                  <Pause size={16} /> Stop
                </button>
              )}
            </div>

            {askSubject && (
              <div className="mt-4 animate-fade-up">
                <p className="text-xs text-foreground/65 mb-2">What did you study? ({formatHM(askSubject.durationMin)})</p>
                <div className="flex gap-2">
                  <input
                    value={subjectDraft} onChange={(e) => setSubjectDraft(e.target.value)}
                    placeholder="Subject / topic"
                    className="flex-1 rounded-full bg-background/70 px-4 py-2 text-sm outline-none placeholder:text-foreground/40"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      const subj = subjectDraft.trim() || "Untitled";
                      actions.addStudySession({ subject: subj, startISO: askSubject.startISO, endISO: askSubject.endISO, durationMin: askSubject.durationMin });
                      setAskSubject(null);
                      setSubjectDraft("");
                    }}
                    className="rounded-full bg-foreground text-background px-4 py-2 text-sm press"
                  >Save</button>
                </div>
                <button onClick={() => setAskSubject(null)} className="mt-2 text-[11px] text-foreground/50 underline">Discard</button>
              </div>
            )}
          </div>
        )}

        {/* Sessions list */}
        {studiedYes && (today.study.sessions?.length ?? 0) > 0 && (
          <div className="card-paper rounded-[24px] p-5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">Sessions today</div>
            <div className="space-y-2 stagger">
              {today.study.sessions.map((s, i) => (
                <div key={s.id} className="flex items-center justify-between text-sm bg-muted rounded-2xl px-4 py-2.5">
                  <div className="flex items-baseline gap-2 flex-1 min-w-0">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">S{i + 1}</span>
                    <span className="font-medium truncate">{s.subject}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] tabular-nums text-muted-foreground">{formatClock(s.startISO)}–{formatClock(s.endISO)}</span>
                    <span className="text-xs tabular-nums">{formatHM(s.durationMin)}</span>
                    <button onClick={() => actions.removeStudySession(s.id)} className="text-foreground/30 hover:text-foreground transition"><X size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-foreground/60">
              Total: <span className="font-display text-base text-foreground">{formatHM(today.study.sessions.reduce((a, s) => a + s.durationMin, 0))}</span>
            </p>
          </div>
        )}

        {/* Plan for tomorrow */}
        <div className="card-mint rounded-[24px] p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/60 mb-2">Plan for tomorrow</div>
          <textarea
            value={plan} onChange={(e) => setPlan(e.target.value)}
            onBlur={() => actions.setStudy({ tomorrowPlan: plan })}
            rows={3}
            placeholder="What do you want to study tomorrow?"
            className="w-full rounded-2xl bg-background/70 p-3 text-sm outline-none resize-none placeholder:text-foreground/40"
          />
          <p className="text-[11px] text-foreground/55 italic mt-2">Carries to tomorrow's Study tab.</p>
        </div>
      </div>
    </AppShell>
  );
}
