import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { actions, useToday } from "@/lib/store";
import { Plus, X } from "lucide-react";

export const Route = createFileRoute("/study")({
  head: () => ({ meta: [{ title: "Study — FocusFlow" }] }),
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
    <AppShell title="Study" subtitle="Track what you learned today.">
      {/* Studied toggle */}
      <div className="card-soft border p-4 mb-4">
        <p className="text-xs font-semibold mb-3">Studied today?</p>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => actions.setStudy({ studiedToday: true, notStudiedReason: undefined })}
            className={`flex-1 rounded-full py-2 text-sm font-medium ${today.study.studiedToday === true ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
          >Yes</button>
          <button
            onClick={() => actions.setStudy({ studiedToday: false })}
            className={`flex-1 rounded-full py-2 text-sm font-medium ${today.study.studiedToday === false ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
          >Not today</button>
        </div>
        {today.study.studiedToday === false && (
          <div className="flex gap-2">
            <input
              value={reason} onChange={(e) => setReason(e.target.value)}
              onBlur={() => actions.setStudy({ notStudiedReason: reason })}
              placeholder="What happened? (just a note)"
              className="flex-1 rounded-full bg-secondary px-3 py-2 text-xs outline-none"
            />
          </div>
        )}
      </div>

      {/* Log entry */}
      <div className="card-soft border p-4 mb-4">
        <p className="text-xs font-semibold mb-3">Log a session</p>
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject / topic" className="rounded-full bg-secondary px-3 py-2 text-xs outline-none" />
          <input value={hh} onChange={(e) => setHh(e.target.value)} placeholder="h" inputMode="numeric" className="w-12 rounded-full bg-secondary px-2 py-2 text-xs text-center outline-none" />
          <input value={mm} onChange={(e) => setMm(e.target.value)} placeholder="m" inputMode="numeric" className="w-12 rounded-full bg-secondary px-2 py-2 text-xs text-center outline-none" />
          <button
            onClick={() => {
              const minutes = (parseInt(hh || "0") || 0) * 60 + (parseInt(mm || "0") || 0);
              if (subject.trim() && minutes > 0) { actions.addStudyEntry({ subject: subject.trim(), minutes }); actions.setStudy({ studiedToday: true }); setSubject(""); setHh(""); setMm(""); }
            }}
            className="rounded-full bg-primary px-3 text-primary-foreground"
          ><Plus size={14} /></button>
        </div>
        {today.study.entries.length > 0 && (
          <>
            <div className="mt-4 space-y-2">
              {today.study.entries.map((e, i) => (
                <div key={i} className="flex items-center justify-between text-sm bg-[var(--peach)] rounded-2xl px-3 py-2">
                  <span className="font-medium">{e.subject}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs">{Math.floor(e.minutes/60)}h {e.minutes%60}m</span>
                    <button onClick={() => actions.removeStudyEntry(i)} className="text-foreground/40"><X size={12} /></button>
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-foreground/60">Total today: <span className="font-semibold text-foreground">{Math.floor(totalMin/60)}h {totalMin%60}m</span></p>
          </>
        )}
      </div>

      {/* Energy */}
      <div className="card-soft border p-4 mb-4">
        <p className="text-xs font-semibold mb-3">Energy level (1–5)</p>
        <div className="flex gap-2">
          {[1,2,3,4,5].map((n) => (
            <button key={n} onClick={() => actions.setStudy({ energy: n })}
              className={`flex-1 rounded-full py-3 text-sm font-bold ${today.study.energy === n ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{n}</button>
          ))}
        </div>
        <p className="text-[11px] text-foreground/60 mt-2">Helpful for spotting your best focus windows.</p>
      </div>

      {/* Tomorrow plan */}
      <div className="card-soft p-4 mb-4 bg-[var(--lilac)]">
        <p className="text-xs font-semibold mb-2">Plan for tomorrow</p>
        <textarea
          value={plan} onChange={(e) => setPlan(e.target.value)}
          onBlur={() => actions.setStudy({ tomorrowPlan: plan })}
          rows={3}
          placeholder="What do you want to study tomorrow?"
          className="w-full rounded-2xl bg-white p-3 text-sm outline-none resize-none"
        />
      </div>
    </AppShell>
  );
}
