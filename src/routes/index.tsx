import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { actions, useStore, useToday, store, detectStudyTask } from "@/lib/store";
import { istDateKey, lastNDays, nowIST, istGreeting } from "@/lib/ist";
import { dailyQuote } from "@/lib/quotes";
import { Plus, X, Flame, Bell, BellOff } from "lucide-react";
import {
  AkshayAvatar,
  TodayScene,
  DonutWidget,
  FlameIllustration,
  QuoteMark,
  PencilIllustration,
} from "@/components/illustrations";

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
  const [greeting, setGreeting] = useState("");
  const [longDate, setLongDate] = useState("");
  useEffect(() => {
    setGreeting(istGreeting("Akshay"));
    const d = nowIST();
    setLongDate(d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }));
  }, []);

  // Task input
  const [taskTitle, setTaskTitle] = useState("");
  const [taskHigh, setTaskHigh] = useState(false);
  const [taskRemind, setTaskRemind] = useState("");
  const [taskScope, setTaskScope] = useState<"today" | "tomorrow">("today");
  const [editingReminder, setEditingReminder] = useState<string | null>(null);
  const [perm, setPerm] = useState<NotificationPermission | "unknown">("unknown");
  useEffect(() => { if (typeof Notification !== "undefined") setPerm(Notification.permission); }, []);
  const requestPerm = async () => {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    setPerm(p);
  };

  // Win + Intention
  const [winDraft, setWinDraft] = useState(today.study.win ?? "");
  const [intentionDraft, setIntentionDraft] = useState(today.intentionText ?? "");
  useEffect(() => { setIntentionDraft(today.intentionText ?? ""); }, [today.intentionText]);

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
  const [nStudy1, setNStudy1] = useState<boolean | null>(null);
  const [nStudy2, setNStudy2] = useState<boolean | null>(null);
  const [nStudy3, setNStudy3] = useState<boolean | null>(null);
  const [nPlan, setNPlan] = useState(today.study.tomorrowPlan ?? "");
  const [nSleep, setNSleep] = useState("23:00");

  const habitDone = habits.filter((h) => today.habits[h.id]?.done).length;
  const taskDone = today.tasksToday.filter((t) => t.done).length;
  const highOpen = today.tasksToday.filter((t) => t.priority === "high" && !t.done).length;

  // Streak: consecutive days with at least 1 habit done
  const streak = useMemo(() => {
    const keys = lastNDays(30).slice().reverse();
    let s = 0;
    for (const k of keys) {
      const d = allDays[k];
      const any = d && habits.some((h) => d.habits[h.id]?.done);
      if (any) s++;
      else if (k !== istDateKey()) break;
      else continue;
    }
    return s;
  }, [allDays, habits]);

  const encouragement = useMemo(() => {
    if (habitDone >= habits.length && habits.length > 0) return `All habits done today, Akshay 🌱`;
    if (habitDone > 0) return `${habitDone} habit${habitDone === 1 ? "" : "s"} done today, Akshay 🌱`;
    if (streak === 0) return `Welcome back, Akshay! Let's continue 🌱`;
    if (streak >= 7) return `${streak}-day streak — beautiful rhythm 🔥`;
    if (streak >= 3) return `${streak}-day streak — keep going ✨`;
    return `Be gentle with yourself today.`;
  }, [habitDone, habits.length, streak]);

  // Circular progress for habits
  const habitPct = habits.length ? habitDone / habits.length : 0;

  // 7-day consistency bubbles (last 7 days incl. today)
  const last7 = useMemo(() => lastNDays(7), []);
  const consistency = useMemo(() => last7.map((k) => {
    const d = allDays[k];
    const any = d && habits.some((h) => d.habits[h.id]?.done);
    const [y, mo, da] = k.split("-").map(Number);
    const weekday = new Date(y, mo - 1, da).toLocaleDateString("en-US", { weekday: "short" })[0];
    return { key: k, filled: !!any, weekday, isToday: k === istDateKey() };
  }), [last7, allDays, habits]);

  // English quote (deterministic per IST day)
  const todayQuote = useMemo(() => dailyQuote(istDateKey()), []);

  const addTask = () => {
    if (!taskTitle.trim()) return;
    actions.addTask(taskScope, taskTitle.trim(), taskHigh ? "high" : "normal");
    if (taskRemind && taskScope === "today") {
      const key = istDateKey();
      setTimeout(() => {
        const t = store.get().days[key]?.tasksToday.slice(-1)[0];
        if (t) actions.setTaskReminder("today", t.id, new Date(taskRemind).toISOString());
      }, 0);
    }
    setTaskTitle(""); setTaskHigh(false); setTaskRemind(""); setTaskScope("today");
  };

  return (
    <AppShell title="Today">
      <div className="space-y-4 stagger">
        {/* Greeting with Akshay avatar + morning scene */}
        <div className="card-paper p-5 relative overflow-hidden">
          <TodayScene className="absolute right-2 top-2 h-16 w-auto opacity-90 pointer-events-none" />
          <div className="flex items-center gap-3 mb-2">
            <AkshayAvatar size={56} waving />
            <div>
              <p className="font-display text-[24px] leading-tight tracking-tight">
                {greeting || "Hello, Akshay"}
              </p>
              <p suppressHydrationWarning className="text-xs text-muted-foreground mt-0.5">{longDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber">
              <Flame size={14} /> {streak} {streak === 1 ? "day" : "days"}
            </span>
            <span className="text-sm text-foreground/70">{encouragement}</span>
          </div>
        </div>

        {/* Quote widget */}
        <div className="card-amber p-4 relative overflow-hidden">
          <div className="absolute -top-1 -left-1 opacity-90"><QuoteMark size={32} /></div>
          <div className="pl-9">
            <span className="text-[10px] uppercase tracking-[0.22em] text-foreground/60">Quote of the day</span>
            <p className="font-display text-[17px] leading-snug text-foreground/90 italic mt-1">"{todayQuote}"</p>
          </div>
        </div>

        {/* Aaj Ka Irada widget */}
        <div className="card-mint p-4 relative overflow-hidden">
          <div className="absolute right-3 top-3 opacity-90"><PencilIllustration size={28} /></div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/60 mb-1.5">Aaj ka irada</div>
          <p className="text-[13px] text-foreground/70 mb-2 pr-8">One thing to definitely do today — what is it?</p>
          <input
            value={intentionDraft}
            onChange={(e) => setIntentionDraft(e.target.value)}
            onBlur={() => actions.setIntentionText(intentionDraft)}
            placeholder="One thing I will do today…"
            className="w-full rounded-full bg-background/70 px-4 py-2.5 text-sm outline-none placeholder:text-foreground/40"
          />
        </div>

        {/* 7-day consistency bubbles */}
        <div className="card-paper p-4">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">Last 7 days</div>
          <div className="flex items-center justify-between gap-2">
            {consistency.map((c) => (
              <div key={c.key} className="flex flex-col items-center gap-1.5 flex-1">
                <div className={`h-7 w-7 rounded-full transition ${c.filled ? "bg-amber" : "bg-muted"} ${c.isToday ? "ring-2 ring-amber ring-offset-2 ring-offset-background" : ""}`} />
                <span className="text-[9px] text-muted-foreground uppercase">{c.weekday}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Widgets row: Habits donut + Streak flame */}
        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-3 card-paper p-5 hover-lift">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">Habits today</div>
            <div className="flex items-center gap-4">
              <DonutWidget pct={habitPct} size={68} />
              <div>
                <div className="font-display text-3xl leading-none">{habitDone}<span className="text-muted-foreground text-xl">/{habits.length}</span></div>
                <div className="text-[11px] text-muted-foreground mt-1">done</div>
              </div>
            </div>
          </div>
          <div className="col-span-2 card-amber p-5 hover-lift">
            <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/60">Streak</div>
            <div className="flex items-center gap-2 mt-3">
              <FlameIllustration size={36} />
              <div>
                <div className="font-display text-3xl leading-none">{streak}</div>
                <div className="text-[10px] text-foreground/60 mt-0.5">{streak === 1 ? "day" : "days"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks summary card */}
        <div className={`p-5 hover-lift ${highOpen > 0 ? "card-blush" : "card-paper"}`}>
          <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/60">Tasks</div>
          <div className="mt-2 flex items-baseline gap-3">
            <div className="font-display text-4xl leading-none">
              {taskDone}<span className="text-foreground/50 text-xl">/{today.tasksToday.length}</span>
            </div>
            <div className="text-[11px] text-foreground/60">
              {highOpen > 0 ? `${highOpen} high priority` : "all clear"}
            </div>
          </div>
        </div>

        {/* Tasks */}
        <section>
          <header className="flex items-baseline justify-between px-1 mb-3 mt-2">
            <h2 className="font-display text-2xl tracking-tight">Tasks</h2>
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">focus</span>
          </header>

          {perm !== "granted" && perm !== "unknown" && (
            <button onClick={requestPerm} className="w-full card-sky p-3 text-sm text-left flex items-center gap-2 press mb-2">
              <Bell size={14} /> Enable notifications for reminders
            </button>
          )}

          <div className="card-paper p-4 space-y-2 mb-3">
            <div className="flex gap-2">
              <input
                value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
                placeholder="Add a task"
                className="flex-1 rounded-full bg-muted px-4 py-2.5 text-sm outline-none placeholder:text-foreground/40"
              />
              <button onClick={() => setTaskHigh(!taskHigh)} className={`rounded-full px-3 press transition ${taskHigh ? "bg-destructive text-destructive-foreground" : "bg-muted"}`} title="High priority"><Flame size={14} /></button>
              <button onClick={addTask} className="rounded-full bg-amber text-[#0A0A0A] px-4 press"><Plus size={14} /></button>
            </div>
            <div className="flex items-center gap-2 px-1">
              <div className="flex rounded-full bg-muted p-0.5">
                <button onClick={() => setTaskScope("today")} className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full press ${taskScope === "today" ? "bg-amber text-[#0A0A0A]" : "text-foreground/60"}`}>Today</button>
                <button onClick={() => setTaskScope("tomorrow")} className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full press ${taskScope === "tomorrow" ? "bg-amber text-[#0A0A0A]" : "text-foreground/60"}`}>Tomorrow</button>
              </div>
              {taskScope === "today" && (
                <>
                  <Bell size={12} className="text-muted-foreground ml-1" />
                  <input
                    type="datetime-local"
                    value={taskRemind}
                    onChange={(e) => setTaskRemind(e.target.value)}
                    className="flex-1 rounded-full bg-muted px-3 py-1.5 text-xs outline-none"
                  />
                  {taskRemind && <button onClick={() => setTaskRemind("")} className="text-muted-foreground"><X size={12} /></button>}
                  {!taskRemind && <button onClick={() => setTaskRemind(defaultReminderLocal())} className="text-[10px] uppercase tracking-wider text-muted-foreground press">+1h</button>}
                </>
              )}
              {taskScope === "tomorrow" && (
                <span className="text-[10px] italic text-muted-foreground">appears tomorrow after midnight IST</span>
              )}
            </div>
          </div>
          {today.tasksTomorrow.length > 0 && (
            <div className="text-[11px] text-muted-foreground italic px-1 -mt-1 mb-2">
              {today.tasksTomorrow.length} task{today.tasksTomorrow.length === 1 ? "" : "s"} queued for tomorrow
            </div>
          )}

          <div className="space-y-2.5 stagger">
            {today.tasksToday.length === 0 ? (
              <div className="card-paper py-6 text-center text-sm text-muted-foreground italic">Nothing here. That's okay.</div>
            ) : (
              today.tasksToday.map((t) => (
                <div key={t.id} className={`${t.priority === "high" ? "card-blush" : "card-paper"}`}>
                  <div className="w-full flex items-center gap-3 p-4">
                    <button onClick={() => actions.toggleTask("today", t.id)}
                      className={`h-6 w-6 rounded-full border-2 flex items-center justify-center text-[12px] transition shrink-0 press ${t.done ? "bg-amber border-amber text-[#0A0A0A]" : "border-foreground/30"}`}>
                      {t.done && <span className="animate-tick">✓</span>}
                    </button>
                    <span className={`flex-1 text-[15px] ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.title}</span>
                    {t.priority === "high" && <span className="text-[10px] uppercase tracking-wider text-destructive font-bold">🔥</span>}
                    <button onClick={() => actions.removeTask("today", t.id)} className="text-foreground/30 hover:text-foreground transition press"><X size={14} /></button>
                  </div>
                  <div className="px-4 pb-3 -mt-1 flex items-center gap-2 text-[11px]">
                    {t.remindAt ? (
                      <button onClick={() => setEditingReminder(editingReminder === t.id ? null : t.id)} className="flex items-center gap-1 text-amber press">
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

        {/* Win of the day */}
        <div className="card-paper p-4">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Win of the day</div>
          <input
            value={winDraft}
            onChange={(e) => setWinDraft(e.target.value)}
            onBlur={() => actions.setStudy({ win: winDraft.trim() || undefined })}
            placeholder="One small thing that went right…"
            className="w-full rounded-full bg-muted px-4 py-2.5 text-sm outline-none placeholder:text-foreground/40"
          />
        </div>

        {/* Tough day */}
        {!toughLogged ? (
          !toughOpen ? (
            <button onClick={() => setToughOpen(true)} className="block w-full text-center text-[12px] text-muted-foreground/80 underline underline-offset-2 py-1 hover:text-foreground transition">
              Bad day?
            </button>
          ) : (
            <div className="card-paper p-5 animate-fade-up">
              <p className="font-display text-lg tracking-tight">That's okay.</p>
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
          <div className="card-lavender p-5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/60 mb-1">Wind down</div>
            <p className="font-display text-xl tracking-tight mb-3">Plan tomorrow — 2 mins</p>
            <div className="space-y-2 mb-3">
              {([
                [nTask1, setNTask1, nStudy1, setNStudy1, 1],
                [nTask2, setNTask2, nStudy2, setNStudy2, 2],
                [nTask3, setNTask3, nStudy3, setNStudy3, 3],
              ] as const).map(([val, setVal, study, setStudy, i]) => {
                const auto = detectStudyTask(val);
                const isStudy = study ?? auto;
                return (
                  <div key={i} className="space-y-1">
                    <input value={val} onChange={(e) => (setVal as (v: string) => void)(e.target.value)} placeholder={`Tomorrow's task ${i}`} className="w-full rounded-full bg-background/70 px-4 py-2 text-sm outline-none placeholder:text-foreground/40" />
                    {val.trim() && (
                      <div className="flex items-center gap-2 px-2">
                        <span className="text-[10px] uppercase tracking-wider text-foreground/50">Study task?</span>
                        <button type="button" onClick={() => (setStudy as (v: boolean) => void)(true)} className={`text-[10px] px-2 py-0.5 rounded-full press ${isStudy ? "bg-amber text-[#0A0A0A]" : "bg-background/60 text-foreground/60"}`}>Yes</button>
                        <button type="button" onClick={() => (setStudy as (v: boolean) => void)(false)} className={`text-[10px] px-2 py-0.5 rounded-full press ${!isStudy ? "bg-amber text-[#0A0A0A]" : "bg-background/60 text-foreground/60"}`}>No</button>
                      </div>
                    )}
                  </div>
                );
              })}
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
                const items = [
                  { title: nTask1, study: nStudy1 },
                  { title: nTask2, study: nStudy2 },
                  { title: nTask3, study: nStudy3 },
                ];
                items.forEach(({ title, study }) => {
                  const t = title.trim();
                  if (!t) return;
                  const isStudy = study ?? detectStudyTask(t);
                  actions.addTask("tomorrow", t, "normal", isStudy);
                });
                if (nPlan.trim()) actions.setStudy({ tomorrowPlan: nPlan.trim() });
                actions.setNightSetup(nSleep);
              }}
              className="w-full rounded-full bg-foreground text-background py-2.5 text-sm font-medium press"
            >Save & wind down</button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function CircularProgress({ pct }: { pct: number }) {
  const size = 64;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * Math.min(1, Math.max(0, pct));
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke="var(--amber)" strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: "stroke-dasharray 0.7s ease" }}
      />
    </svg>
  );
}
