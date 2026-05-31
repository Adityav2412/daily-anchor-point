import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { actions, useToday } from "@/lib/store";
import { Plus, X } from "lucide-react";

export const Route = createFileRoute("/study")({
  head: () => ({ meta: [{ title: "Study — daily." }] }),
  component: StudyPage,
});

function StudyPage() {
  const today = useToday();
  const [subject, setSubject] = useState("");
  const [hh, setHh] = useState("");
  const [mm, setMm] = useState("");
  const [reason, setReason] = useState(today.study.notStudiedReason ?? "");
  const [plan, setPlan] = useState(today.study.tomorrowPlan ?? "");
  const totalMin = today.study.entries.reduce((a, e) => a + e.minutes, 0);

  return (
    <AppShell title="Study">
      <div className="space-y-4 stagger">
        {/* Studied today */}
        <div className="card-paper rounded-[24px] p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">Studied today?</div>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => actions.setStudy({ studiedToday: true, notStudiedReason: undefined })}
              className={`flex-1 rounded-full py-2.5 text-sm font-semibold press transition ${today.study.studiedToday === true ? "bg-foreground text-background" : "bg-muted"}`}
            >Yes</button>
            <button
              onClick={() => actions.setStudy({ studiedToday: false })}
              className={`flex-1 rounded-full py-2.5 text-sm font-semibold press transition ${today.study.studiedToday === false ? "bg-foreground text-background" : "bg-muted"}`}
            >Not today</button>
          </div>
          {today.study.studiedToday === false && (
            <input
              value={reason} onChange={(e) => setReason(e.target.value)}
              onBlur={() => actions.setStudy({ notStudiedReason: reason })}
              placeholder="What happened? (just a note)"
              className="w-full rounded-full bg-muted px-4 py-2 text-xs outline-none placeholder:text-foreground/40 animate-fade-up"
            />
          )}
        </div>

        {/* Log entry */}
        <div className="card-peach rounded-[24px] p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/60 mb-3">Log a session</div>
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2">
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject / topic" className="rounded-full bg-background/70 px-4 py-2.5 text-sm outline-none placeholder:text-foreground/40" />
            <input value={hh} onChange={(e) => setHh(e.target.value)} placeholder="h" inputMode="numeric" className="w-12 rounded-full bg-background/70 px-2 py-2.5 text-sm text-center outline-none" />
            <input value={mm} onChange={(e) => setMm(e.target.value)} placeholder="m" inputMode="numeric" className="w-12 rounded-full bg-background/70 px-2 py-2.5 text-sm text-center outline-none" />
            <button
              onClick={() => {
                const minutes = (parseInt(hh || "0") || 0) * 60 + (parseInt(mm || "0") || 0);
                if (subject.trim() && minutes > 0) { actions.addStudyEntry({ subject: subject.trim(), minutes }); actions.setStudy({ studiedToday: true }); setSubject(""); setHh(""); setMm(""); }
              }}
              className="rounded-full bg-foreground text-background px-3 press"
            ><Plus size={14} /></button>
          </div>
          {today.study.entries.length > 0 && (
            <>
              <div className="mt-4 space-y-2 stagger">
                {today.study.entries.map((e, i) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-background/70 rounded-2xl px-4 py-2.5">
                    <span className="font-medium">{e.subject}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-xs tabular-nums text-muted-foreground">{Math.floor(e.minutes/60)}h {e.minutes%60}m</span>
                      <button onClick={() => actions.removeStudyEntry(i)} className="text-foreground/30 hover:text-foreground transition"><X size={12} /></button>
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-foreground/60">Total: <span className="font-display text-base text-foreground">{Math.floor(totalMin/60)}h {totalMin%60}m</span></p>
            </>
          )}
        </div>

        {/* Energy */}
        <div className="card-lavender rounded-[24px] p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/60 mb-3">Energy level</div>
          <div className="flex gap-2">
            {[1,2,3,4,5].map((n) => (
              <button key={n} onClick={() => actions.setStudy({ energy: n })}
                className={`flex-1 rounded-full py-3 font-display text-xl press transition ${today.study.energy === n ? "bg-foreground text-background" : "bg-background/70"}`}>{n}</button>
            ))}
          </div>
          <p className="text-[11px] text-foreground/60 mt-2 italic">Helpful for spotting your best focus windows.</p>
        </div>

        {/* Tomorrow */}
        <div className="card-mint rounded-[24px] p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/60 mb-2">Plan for tomorrow</div>
          <textarea
            value={plan} onChange={(e) => setPlan(e.target.value)}
            onBlur={() => actions.setStudy({ tomorrowPlan: plan })}
            rows={3}
            placeholder="What do you want to study tomorrow?"
            className="w-full rounded-2xl bg-background/70 p-3 text-sm outline-none resize-none placeholder:text-foreground/40"
          />
        </div>
      </div>
    </AppShell>
  );
}
