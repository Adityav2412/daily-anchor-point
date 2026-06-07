import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { actions, useStore, useToday, store } from "@/lib/store";
import { istDateKey, lastNDays, formatISTDate, nowIST, istGreeting } from "@/lib/ist";
import { Plus, X, Flame, Bell, BellOff } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Today — daily." }] }),
  component: TodayPage,
});

function defaultReminderLocal(): string {
  const d = nowIST();
  d.setMinutes(d.getMinutes() + 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function formatReminder(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function TodayPage() {
  const today = useToday();
  const habits = useStore((s) => s.habits);
  const allDays = useStore((s) => s.days);
  const todayKey = istDateKey();
  const days = lastNDays(7);
  const [winDraft, setWinDraft] = useState(today.study.win ?? "");
  const [greeting, setGreeting] = useState("");
  useEffect(() => { setGreeting(istGreeting("Akshay")); }, []);

  // Task input
  const [taskTitle, setTaskTitle] = useState("");
  const [taskHigh, setTaskHigh] = useState(false);
  const [taskRemind, setTaskRemind] = useState("");
  const [editingReminder, setEditingReminder] = useState<string | null>(null);
  const [perm, setPerm] = useState<NotificationPermission | "unknown">("unknown");
  useEffect(() => { if (typeof Notification !== "undefined") setPerm(Notification.permission); }, []);
  const requestPerm = async () => {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    setPerm(p);
  };

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
  const loggedCount = Object.keys(allDays).length;
  const taskDone = today.tasksToday.filter((t) => t.done).length;
  const highOpen = today.tasksToday.filter((t) => t.priority === "high" && !t.done).length;

  const addTask = () => {
    if (!taskTitle.trim()) return;
    actions.addTask("today", taskTitle.trim(), taskHigh ? "high" : "normal");
    if (taskRemind) {
      const key = istDateKey();
      setTimeout(() => {
        const t = store.get().days[key]?.tasksToday.slice(-1)[0];
        if (t) actions.setTaskReminder("today", t.id, new Date(taskRemind).toISOString());
      }, 0);
    }
    setTaskTitle(""); setTaskHigh(false); setTaskRemind("");
  };

  return (
    <AppShell title="Today">
      <div className="space-y-4 stagger">
        {/* Greeting */}
        <div suppressHydrationWarning className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground font-medium px-1">
          {greeting || "\u00a0"}
        </div>

        {/* Days logged */}
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
              const any = !!d && (Object.keys(d.habits).length || (d.study.sessions?.length ?? 0) || d.study.entries.length || d.tasksToday.length);
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

        {/* Habits + tasks summary */}
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
            <button onClick={() => actions.setStudy({ win: winDraft })} className="rounded-full bg-foreground px-4 py-2.5 text-sm text-background press">Save</button>
          </div>
        </div>

        {/* Tasks */}
        <section>
          <header className="flex items-baseline justify-between px-1 mb-3 mt-2">
            <h2 className="font-display text-2xl tracking-tight">Tasks</h2>
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">focus</span>
          </header>

          {perm !== "granted" && perm !== "unknown" && (
            <button onClick={requestPerm} className="w-full card-sky rounded-2xl p-3 text-sm text-left flex items-center gap-2 press mb-2">
              <Bell size={14} /> Enable notifications for reminders
            </button>
          )}

          <div className="card-paper rounded-[24px] p-4 space-y-2 mb-3">
            <div className="flex gap-2">
              <input
                value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
                placeholder="Add a task"
                className="flex-1 rounded-full bg-muted px-4 py-2.5 text-sm outline-none placeholder:text-foreground/40"
              />
              <button onClick={() => setTaskHigh(!taskHigh)} className={`rounded-full px-3 press transition ${taskHigh ? "bg-destructive text-destructive-foreground" : "bg-muted"}`} title="High priority"><Flame size={14} /></button>
              <button onClick={addTask} className="rounded-full bg-foreground text-background px-4 press"><Plus size={14} /></button>
            </div>
            <div className="flex items-center gap-2 px-1">
              <Bell size={12} className="text-muted-foreground" />
              <input
                type="datetime-local"
                value={taskRemind}
                onChange={(e) => setTaskRemind(e.target.value)}
                className="flex-1 rounded-full bg-muted px-3 py-1.5 text-xs outline-none"
              />
              {taskRemind && <button onClick={() => setTaskRemind("")} className="text-muted-foreground"><X size={12} /></button>}
              {!taskRemind && <button onClick={() => setTaskRemind(defaultReminderLocal())} className="text-[10px] uppercase tracking-wider text-muted-foreground press">+1h</button>}
            </div>
          </div>

          <div className="space-y-2.5 stagger">
            {today.tasksToday.length === 0 ? (
              <div className="card-paper rounded-2xl py-6 text-center text-sm text-muted-foreground italic">Nothing here. That's okay.</div>
            ) : (
              today.tasksToday.map((t) => (
                <div key={t.id} className={`rounded-2xl ${t.priority === "high" ? "card-blush" : "card-paper"}`}>
                  <div className="w-full flex items-center gap-3 p-4">
                    <button onClick={() => actions.toggleTask("today", t.id)}
                      className={`h-6 w-6 rounded-full border-2 flex items-center justify-center text-[12px] transition shrink-0 press ${t.done ? "bg-foreground border-foreground text-background" : "border-foreground/30"}`}>
                      {t.done && "✓"}
                    </button>
                    <span className={`flex-1 text-[15px] ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.title}</span>
                    {t.priority === "high" && <span className="text-[10px] uppercase tracking-wider text-destructive font-bold">🔥 High</span>}
                    <button onClick={() => actions.removeTask("today", t.id)} className="text-foreground/30 hover:text-foreground transition press"><X size={14} /></button>
                  </div>
                  <div className="px-4 pb-3 -mt-1 flex items-center gap-2 text-[11px]">
                    {t.remindAt ? (
                      <button onClick={() => setEditingReminder(editingReminder === t.id ? null : t.id)} className="flex items-center gap-1 text-foreground/70 press">
                        <Bell size={11} /> {formatReminder(t.remindAt)}
                      </button>
                    ) : (
                      <button onClick={() => setEditingReminder(editingReminder === t.id ? null : t.id)} className="flex items-center gap-1 text-muted-foreground press">
                        <BellOff size={11} /> Add reminder
                      </button>
                    )}
                    {editingReminder === t.id && (
                      <>
                        <input
                          type="datetime-local"
                          defaultValue={t.remindAt ? t.remindAt.slice(0, 16) : defaultReminderLocal()}
                          onChange={(e) => actions.setTaskReminder("today", t.id, e.target.value ? new Date(e.target.value).toISOString() : null)}
                          className="flex-1 rounded-full bg-muted px-2 py-1 text-[11px] outline-none"
                        />
                        {t.remindAt && (
                          <button onClick={() => { actions.setTaskReminder("today", t.id, null); setEditingReminder(null); }} className="text-muted-foreground"><X size={11} /></button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Tough day */}
        {!toughLogged ? (
          !toughOpen ? (
            <button onClick={() => setToughOpen(true)} className="block w-full text-center text-[12px] text-muted-foreground/80 underline underline-offset-2 py-1 hover:text-foreground transition">
              Bad day?
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
            <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/60 mb-1">Wind down</div>
            <p className="font-display text-xl tracking-tight mb-3">Plan tomorrow in 2 minutes<span className="italic font-light text-muted-foreground">.</span></p>
            <div className="space-y-2 mb-3">
              <input value={nTask1} onChange={(e) => setNTask1(e.target.value)} placeholder="Tomorrow's task 1" className="w-full rounded-full bg-background/70 px-4 py-2 text-sm outline-none placeholder:text-foreground/40" />
              <input value={nTask2} onChange={(e) => setNTask2(e.target.value)} placeholder="Tomorrow's task 2" className="w-full rounded-full bg-background/70 px-4 py-2 text-sm outline-none placeholder:text-foreground/40" />
              <input value={nTask3} onChange={(e) => setNTask3(e.target.value)} placeholder="Tomorrow's task 3" className="w-full rounded-full bg-background/70 px-4 py-2 text-sm outline-none placeholder:text-foreground/40" />
            </div>
            <textarea
              value={nPlan} onChange={(e) => setNPlan(e.target.value)}
              rows={2}
              placeholder="What to study tomorrow? (carries to Study tab)"
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
