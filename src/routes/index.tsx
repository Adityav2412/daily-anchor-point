import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { actions, useStore, useToday } from "@/lib/store";
import { istDateKey, lastNDays, formatISTDate } from "@/lib/ist";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Today — FocusFlow" }, { name: "description", content: "Your day, gently tracked." }] }),
  component: TodayPage,
});

function TodayPage() {
  const today = useToday();
  const habits = useStore((s) => s.habits);
  const allDays = useStore((s) => s.days);
  const todayKey = istDateKey();
  const days = lastNDays(6);
  const [winDraft, setWinDraft] = useState(today.study.win ?? "");
  const [reflectDraft, setReflectDraft] = useState(today.study.reflection ?? "");

  const habitDone = habits.filter((h) => today.habits[h.id]?.done).length;
  const studyMin = today.study.entries.reduce((a, e) => a + e.minutes, 0);
  const loggedCount = Object.keys(allDays).length;

  return (
    <AppShell title="Today" subtitle="One step at a time.">
      {/* Days logged banner (neutral, no streaks) */}
      <div className="card-soft p-5 mb-4 bg-[var(--sky)]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-medium text-foreground/70">Days logged</p>
            <p className="text-2xl font-bold">{loggedCount} {loggedCount === 1 ? "day" : "days"}</p>
          </div>
          <Sparkles className="text-foreground/60" size={20} />
        </div>
        <div className="flex justify-between gap-2">
          {days.map((k) => {
            const d = allDays[k];
            const anyLog = !!d && (Object.keys(d.habits).length || d.study.entries.length || d.tasksToday.length);
            return (
              <div key={k} className="flex flex-col items-center gap-1 flex-1">
                <span className="text-[10px] text-foreground/60">{formatISTDate(k)}</span>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs ${k === todayKey ? "ring-2 ring-foreground bg-white" : anyLog ? "bg-white" : "bg-white/40"}`}>
                  {anyLog ? "•" : ""}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Win of the day */}
      <div className="card-soft p-5 mb-4 bg-[var(--mint)]">
        <p className="text-xs font-semibold mb-2">Win of the day</p>
        {today.study.win ? (
          <p className="text-base font-medium">{today.study.win}</p>
        ) : (
          <p className="text-sm text-foreground/60">Anything counts — even getting out of bed.</p>
        )}
        <div className="mt-3 flex gap-2">
          <input
            value={winDraft}
            onChange={(e) => setWinDraft(e.target.value)}
            placeholder="What went well today?"
            className="flex-1 rounded-full bg-white px-4 py-2 text-sm outline-none"
          />
          <button
            onClick={() => actions.setStudy({ win: winDraft })}
            className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
          >Save</button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Stat label="Habits" value={`${habitDone}/${habits.length}`} bg="var(--lilac)" />
        <Stat label="Study" value={`${Math.floor(studyMin / 60)}h ${studyMin % 60}m`} bg="var(--peach)" />
        <Stat label="Energy" value={today.study.energy ? `${today.study.energy}/5` : "—"} bg="var(--sky)" />
      </div>

      {/* Today's tasks preview */}
      <div className="card-soft p-5 mb-4 border">
        <p className="text-xs font-semibold mb-3 text-foreground/60 uppercase tracking-wider">Today's tasks</p>
        {today.tasksToday.length === 0 ? (
          <p className="text-sm text-foreground/60">No tasks today. Keep it light.</p>
        ) : (
          <ul className="space-y-2">
            {today.tasksToday.slice(0, 5).map((t) => (
              <li key={t.id} className="flex items-center gap-3">
                <button
                  onClick={() => actions.toggleTask("today", t.id)}
                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ${t.done ? "bg-primary border-primary" : "border-foreground/30"}`}
                />
                <span className={`flex-1 text-sm ${t.done ? "line-through text-foreground/40" : ""} ${t.priority === "high" ? "text-[color:var(--danger)] font-medium" : ""}`}>{t.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Reflection */}
      <div className="card-soft p-5 mb-4 border">
        <p className="text-xs font-semibold mb-2 text-foreground/60 uppercase tracking-wider">How did today feel?</p>
        <div className="flex gap-2">
          <input
            value={reflectDraft}
            onChange={(e) => setReflectDraft(e.target.value)}
            placeholder="One line is enough."
            className="flex-1 rounded-full bg-secondary px-4 py-2 text-sm outline-none"
          />
          <button
            onClick={() => actions.setStudy({ reflection: reflectDraft })}
            className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
          >Save</button>
        </div>
        {today.study.reflection && <p className="text-xs text-foreground/60 mt-2">Saved: "{today.study.reflection}"</p>}
      </div>
    </AppShell>
  );
}

function Stat({ label, value, bg }: { label: string; value: string; bg: string }) {
  return (
    <div className="card-soft p-4" style={{ background: bg }}>
      <p className="text-[10px] uppercase tracking-wider text-foreground/60 font-semibold">{label}</p>
      <p className="text-lg font-bold mt-1">{value}</p>
    </div>
  );
}
