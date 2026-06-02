import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { actions, useStore, useToday } from "@/lib/store";
import { istDateKey, lastNDays, formatISTDate, nowIST } from "@/lib/ist";

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

  // Morning intention drafts
  const [iGoal, setIGoal] = useState("");
  const [iEnergy, setIEnergy] = useState(0);
  const [iHabit, setIHabit] = useState<string | undefined>(undefined);
  const intentionSet = !!today.intention;

  // Tough day
  const [toughOpen, setToughOpen] = useState(false);
  const [toughNote, setToughNote] = useState("");
  const toughLogged = !!today.toughDay;

  // Night setup (after 8PM IST)
  const [isEvening, setIsEvening] = useState(false);
  useEffect(() => { setIsEvening(nowIST().getHours() >= 20); }, []);
  const nightDone = !!today.nightSetup;
  const [nTask1, setNTask1] = useState("");
  const [nTask2, setNTask2] = useState("");
  const [nTask3, setNTask3] = useState("");
  const [nPlan, setNPlan] = useState(today.study.tomorrowPlan ?? "");
  const [nSleep, setNSleep] = useState("23:00");

  const habitDone = habits.filter((h) => today.habits[h.id]?.done).length;
  const habitPct = habits.length ? Math.round((habitDone / habits.length) * 100) : 0;
  const studyMin = today.study.entries.reduce((a, e) => a + e.minutes, 0);
  const loggedCount = Object.keys(allDays).length;
  const taskDone = today.tasksToday.filter((t) => t.done).length;
  const highOpen = today.tasksToday.filter((t) => t.priority === "high" && !t.done).length;

  return (
    <AppShell title="Today">
      <div className="space-y-4 stagger">
        {/* Morning Intention */}
        {!intentionSet ? (
          <div className="card-butter rounded-[24px] p-5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/60 mb-1">Good morning, Akshay</div>
            <p className="font-display text-xl tracking-tight mb-3">Set your intention<span className="italic font-light text-muted-foreground">.</span></p>
            <input
              value={iGoal}
              onChange={(e) => setIGoal(e.target.value)}
              placeholder="One study goal for today"
              className="w-full rounded-full bg-background/70 px-4 py-2.5 text-sm outline-none mb-2 placeholder:text-foreground/40"
            />
            <div className="flex gap-1.5 mb-2">
              {[1,2,3,4,5].map((n) => (
                <button key={n} onClick={() => setIEnergy(n)}
                  className={`flex-1 rounded-full py-2 font-display text-base press transition ${iEnergy === n ? "bg-foreground text-background" : "bg-background/70"}`}>{n}</button>
              ))}
            </div>
            <div className="text-[11px] text-foreground/55 mb-2 px-1">Energy expectation today</div>
            {habits.length > 0 && (
              <select
                value={iHabit ?? ""}
                onChange={(e) => setIHabit(e.target.value || undefined)}
                className="w-full rounded-full bg-background/70 px-4 py-2.5 text-sm outline-none mb-3"
              >
                <option value="">Pick one priority habit…</option>
                {habits.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            )}
            <button
              onClick={() => {
                if (!iGoal.trim() || !iEnergy) return;
                actions.setIntention({ goal: iGoal.trim(), energy: iEnergy, habitId: iHabit });
              }}
              disabled={!iGoal.trim() || !iEnergy}
              className="w-full rounded-full bg-foreground text-background py-2.5 text-sm press disabled:opacity-40"
            >Save intention</button>
          </div>
        ) : (
          <div className="card-butter rounded-[24px] p-4 flex items-start gap-3">
            <span className="text-xl">🌅</span>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/60">Today's intention</div>
              <p className="font-display text-base tracking-tight truncate">{today.intention!.goal}</p>
              <p className="text-[11px] text-foreground/55">Energy {today.intention!.energy}/5{today.intention!.habitId && habits.find((h) => h.id === today.intention!.habitId) ? ` · focus: ${habits.find((h) => h.id === today.intention!.habitId)!.name}` : ""}</p>
            </div>
            <button onClick={() => actions.clearIntention()} className="text-[11px] text-foreground/40 underline">Edit</button>
          </div>
        )}

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
          {energyOpen ? (
            <div className="card-lavender rounded-[24px] p-5">
              <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/60 mb-3">Energy</div>
              <div className="flex gap-2">
                {[1,2,3,4,5].map((n) => (
                  <button key={n} onClick={() => { actions.setStudy({ energy: n }); setEnergyOpen(false); }}
                    className={`flex-1 rounded-full py-3 font-display text-xl press transition ${today.study.energy === n ? "bg-foreground text-background" : "bg-background/70"}`}>{n}</button>
                ))}
              </div>
              <button onClick={() => setEnergyOpen(false)} className="mt-3 text-[11px] text-foreground/50 underline">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setEnergyOpen(true)} className="text-left card-lavender rounded-[24px] p-5 press transition">
              <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/60">Energy</div>
              <div className="mt-3 font-display text-5xl leading-none">{today.study.energy ?? "—"}{today.study.energy && <span className="text-muted-foreground text-2xl">/5</span>}</div>
              <div className="text-xs text-foreground/60 mt-1">Tap to log today.</div>
            </button>
          )}
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

        {/* Tough day */}
        {!toughLogged ? (
          !toughOpen ? (
            <button onClick={() => setToughOpen(true)} className="block w-full text-center text-[12px] text-muted-foreground/80 underline underline-offset-2 py-1 hover:text-foreground transition">
              Tough day?
            </button>
          ) : (
            <div className="card-paper rounded-[24px] p-5 animate-fade-up">
              <p className="font-display text-lg tracking-tight">That's okay<span className="italic font-light text-muted-foreground">.</span></p>
              <p className="text-sm text-foreground/65 mt-1">Rest is part of the process.</p>
              <textarea
                value={toughNote}
                onChange={(e) => setToughNote(e.target.value)}
                rows={2}
                placeholder="What happened? (optional)"
                className="mt-3 w-full rounded-2xl bg-muted p-3 text-sm outline-none resize-none placeholder:text-foreground/40"
              />
              <div className="flex gap-2 mt-3">
                <button onClick={() => { setToughOpen(false); setToughNote(""); }} className="flex-1 rounded-full bg-muted py-2 text-sm press">Cancel</button>
                <button onClick={() => { actions.logToughDay(toughNote); setToughOpen(false); }} className="flex-1 rounded-full bg-foreground text-background py-2 text-sm press">Log silently</button>
              </div>
            </div>
          )
        ) : (
          <div className="text-center text-[11px] text-muted-foreground/80 italic py-1">Logged. Be gentle with yourself.</div>
        )}

        {/* Night setup */}
        {isEvening && !nightDone && (
          <div className="card-lavender rounded-[24px] p-5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/60 mb-1">Wind down, Akshay</div>
            <p className="font-display text-xl tracking-tight mb-3">Plan tomorrow in 2 minutes<span className="italic font-light text-muted-foreground">.</span></p>
            <div className="space-y-2 mb-3">
              <input value={nTask1} onChange={(e) => setNTask1(e.target.value)} placeholder="Tomorrow's task 1" className="w-full rounded-full bg-background/70 px-4 py-2 text-sm outline-none placeholder:text-foreground/40" />
              <input value={nTask2} onChange={(e) => setNTask2(e.target.value)} placeholder="Tomorrow's task 2" className="w-full rounded-full bg-background/70 px-4 py-2 text-sm outline-none placeholder:text-foreground/40" />
              <input value={nTask3} onChange={(e) => setNTask3(e.target.value)} placeholder="Tomorrow's task 3" className="w-full rounded-full bg-background/70 px-4 py-2 text-sm outline-none placeholder:text-foreground/40" />
            </div>
            <textarea
              value={nPlan} onChange={(e) => setNPlan(e.target.value)}
              rows={2}
              placeholder="What to study tomorrow?"
              className="w-full rounded-2xl bg-background/70 p-3 text-sm outline-none resize-none placeholder:text-foreground/40 mb-2"
            />
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] text-foreground/60 px-1">Sleep by</span>
              <input type="time" value={nSleep} onChange={(e) => setNSleep(e.target.value)} className="rounded-full bg-background/70 px-3 py-1.5 text-xs outline-none" />
            </div>
            <button
              onClick={() => {
                [nTask1, nTask2, nTask3].forEach((t) => { if (t.trim()) actions.addTask("tomorrow", t.trim(), "normal"); });
                if (nPlan.trim()) actions.setStudy({ tomorrowPlan: nPlan.trim() });
                actions.setNightSetup(nSleep);
              }}
              className="w-full rounded-full bg-foreground text-background py-2.5 text-sm press"
            >Save & rest</button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
