import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { actions, useStore, useToday } from "@/lib/store";
import { istDateKey, lastNDays, formatISTDate } from "@/lib/ist";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Today — daily." }] }),
  component: TodayPage,
});

function TodayPage() {
  const today = useToday();
  const habits = useStore((s) => s.habits);
  const allDays = useStore((s) => s.days);
  const todayKey = istDateKey();
  const days = lastNDays(7);
  const [winDraft, setWinDraft] = useState(today.study.win ?? "");
  const [reflectDraft, setReflectDraft] = useState(today.study.reflection ?? "");
  const [energyOpen, setEnergyOpen] = useState(false);

  const habitDone = habits.filter((h) => today.habits[h.id]?.done).length;
  const habitPct = habits.length ? Math.round((habitDone / habits.length) * 100) : 0;
  const studyMin = today.study.entries.reduce((a, e) => a + e.minutes, 0);
  const loggedCount = Object.keys(allDays).length;
  const taskDone = today.tasksToday.filter((t) => t.done).length;
  const highOpen = today.tasksToday.filter((t) => t.priority === "high" && !t.done).length;

  return (
    <AppShell title="Today">
      <div className="space-y-4 stagger">
        {/* Days logged — Napa banner */}
        <div className="card-sky rounded-[28px] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl animate-flicker">🌿</span>
              <div className="font-display text-[22px] tracking-tight">
                {loggedCount} {loggedCount === 1 ? "day" : "days"} logged
              </div>
            </div>
            <span className="text-[10px] uppercase tracking-[0.18em] text-foreground/55">gentle</span>
          </div>
          <div className="flex items-end justify-between gap-1.5">
            {days.map((k) => {
              const d = allDays[k];
              const isToday = k === todayKey;
              const any = !!d && (Object.keys(d.habits).length || d.study.entries.length || d.tasksToday.length);
              return (
                <div key={k} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="text-[10px] text-foreground/55 font-medium tabular-nums">{formatISTDate(k)}</div>
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center text-base transition ${isToday ? "ring-ink bg-background" : ""}`}>
                    {any ? "🌿" : isToday ? "" : "·"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress + tasks */}
        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-3 card-paper rounded-[24px] p-5 hover-lift">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Habits today</div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-5xl leading-none">{habitPct}</span>
              <span className="text-muted-foreground">%</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">{habitDone} of {habits.length} done</div>
            <div className="mt-4 h-1.5 w-full rounded-full bg-foreground/10 overflow-hidden">
              <div className="h-full bg-foreground transition-all duration-700" style={{ width: `${habitPct}%` }} />
            </div>
          </div>
          <div className={`col-span-2 rounded-[24px] p-5 hover-lift ${highOpen > 0 ? "card-blush" : "card-mint"}`}>
            <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/60">Tasks</div>
            <div className="mt-3 font-display text-5xl leading-none">
              {taskDone}<span className="text-muted-foreground text-2xl">/{today.tasksToday.length}</span>
            </div>
            <div className="text-xs text-foreground/60 mt-1">
              {highOpen > 0 ? `${highOpen} high priority` : "all clear"}
            </div>
          </div>
        </div>

        {/* Win of the day */}
        <div className="card-butter rounded-[24px] p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/60 mb-2">Win of the day</div>
          {today.study.win ? (
            <p className="font-display text-xl tracking-tight">{today.study.win}<span className="italic font-light text-muted-foreground">.</span></p>
          ) : (
            <p className="text-sm text-foreground/60 italic">Anything counts — even getting out of bed.</p>
          )}
          <div className="mt-3 flex gap-2">
            <input
              value={winDraft}
              onChange={(e) => setWinDraft(e.target.value)}
              placeholder="What went well?"
              className="flex-1 rounded-full bg-background/70 px-4 py-2.5 text-sm outline-none placeholder:text-foreground/40"
            />
            <button
              onClick={() => actions.setStudy({ win: winDraft })}
              className="rounded-full bg-foreground px-4 py-2.5 text-sm text-background press"
            >Save</button>
          </div>
        </div>

        {/* Energy + study */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setEnergyOpen(true)} className="text-left card-lavender rounded-[24px] p-5 press transition">
            <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/60">Energy</div>
            <div className="mt-3 font-display text-5xl leading-none">{today.study.energy ?? "—"}{today.study.energy && <span className="text-muted-foreground text-2xl">/5</span>}</div>
            <div className="text-xs text-foreground/60 mt-1">Tap to log today.</div>
          </button>
          <div className="card-peach rounded-[24px] p-5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/60">Studied</div>
            <div className="mt-3 font-display text-5xl leading-none">{Math.floor(studyMin/60)}<span className="text-muted-foreground text-2xl">h {studyMin%60}m</span></div>
            <div className="text-xs text-foreground/60 mt-1">Today's sessions.</div>
          </div>
        </div>

        {/* Today's tasks preview */}
        <section>
          <header className="flex items-baseline justify-between px-1 mb-3 mt-2">
            <div className="flex items-baseline gap-2">
              <h2 className="font-display text-2xl tracking-tight">Today's Tasks</h2>
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">focus</span>
            </div>
            <Link to="/tasks" className="text-xs text-muted-foreground tabular-nums bg-foreground/5 px-2.5 py-1 rounded-full hover:bg-foreground/10 transition">Manage →</Link>
          </header>
          <div className="space-y-2.5 stagger">
            {today.tasksToday.length === 0 ? (
              <div className="card-paper rounded-2xl py-6 text-center text-sm text-muted-foreground italic">Nothing here. That's okay.</div>
            ) : (
              today.tasksToday.slice(0, 5).map((t) => (
                <button
                  key={t.id}
                  onClick={() => actions.toggleTask("today", t.id)}
                  className={`w-full flex items-center gap-3 rounded-2xl p-4 text-left press ${t.priority === "high" ? "card-blush" : "card-paper"}`}
                >
                  <span className={`h-6 w-6 rounded-full border-2 flex items-center justify-center text-[12px] transition ${t.done ? "bg-foreground border-foreground text-background" : "border-foreground/30"}`}>
                    {t.done && "✓"}
                  </span>
                  <span className={`flex-1 text-[15px] ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.title}</span>
                  {t.priority === "high" && <span className="text-[10px] uppercase tracking-wider text-destructive font-bold">🔥 High</span>}
                </button>
              ))
            )}
          </div>
        </section>

        {/* Reflection */}
        <div className="card-paper rounded-[24px] p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">How did today feel?</div>
          <div className="flex gap-2">
            <input
              value={reflectDraft}
              onChange={(e) => setReflectDraft(e.target.value)}
              placeholder="One line is enough."
              className="flex-1 rounded-full bg-muted px-4 py-2.5 text-sm outline-none placeholder:text-foreground/40"
            />
            <button onClick={() => actions.setStudy({ reflection: reflectDraft })} className="rounded-full bg-foreground px-4 py-2.5 text-sm text-background press">Save</button>
          </div>
          {today.study.reflection && <p className="text-xs text-muted-foreground italic mt-2">"{today.study.reflection}"</p>}
        </div>
      </div>
    </AppShell>
  );
}
