import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Companion } from "@/components/Companion";
import { actions, useStore, useToday, type Mood, type Energy } from "@/lib/store";
import { istDateKey, nowIST, istGreeting, formatHM } from "@/lib/ist";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Today — LIFE" }] }),
  component: TodayPage,
});

const MOODS: { value: Mood; emoji: string; label: string }[] = [
  { value: "difficult", emoji: "😔", label: "Difficult" },
  { value: "okay", emoji: "😐", label: "Okay" },
  { value: "good", emoji: "🙂", label: "Good" },
  { value: "great", emoji: "😄", label: "Great" },
];
const ENERGIES: { value: Energy; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const FOCUS_SUGGESTIONS = [
  "Take care of myself",
  "Go for a walk",
  "Call a friend",
  "Drink enough water",
];

function TodayPage() {
  const today = useToday();
  const habits = useStore((s) => s.habits);
  const events = useStore((s) => s.events ?? []);
  const days = useStore((s) => s.days);
  const garden = useStore((s) => s.garden ?? { stage: 0 });
  const [greeting, setGreeting] = useState("");
  const [longDate, setLongDate] = useState("");
  useEffect(() => {
    setGreeting(istGreeting("Akshay"));
    const d = nowIST();
    setLongDate(d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }));
  }, []);

  const [focusDraft, setFocusDraft] = useState(today.focus ?? "");
  useEffect(() => { setFocusDraft(today.focus ?? ""); }, [today.focus]);

  const [winDraft, setWinDraft] = useState(today.study.win ?? "");
  useEffect(() => { setWinDraft(today.study.win ?? ""); }, [today.study.win]);

  const [toughOpen, setToughOpen] = useState(false);
  const [toughMood, setToughMood] = useState<Mood>("difficult");
  const [toughNote, setToughNote] = useState("");
  const toughLogged = !!today.toughDay;

  const habitDone = habits.filter((h) => today.habits[h.id]?.done).length;
  const todayKey = istDateKey();

  // Today's agenda preview: today events + today tasks + upcoming tasks due today
  const agendaToday = useMemo(() => {
    type Item = { k: "event" | "task"; title: string; done?: boolean };
    const out: Item[] = [];
    for (const e of events) if (e.date === todayKey) out.push({ k: "event", title: e.name });
    const td = days[todayKey];
    if (td) for (const t of td.tasksToday) out.push({ k: "task", title: t.title, done: t.done });
    for (const dk of Object.keys(days)) {
      for (const t of days[dk].tasksUpcoming ?? []) {
        if (t.dueDate === todayKey) out.push({ k: "task", title: t.title, done: t.done });
      }
    }
    return out;
  }, [events, days, todayKey]);

  const nextEvent = useMemo(() => {
    return [...events]
      .filter((e) => e.date >= todayKey)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
  }, [events, todayKey]);

  const saveFocus = () => actions.setFocus(focusDraft);
  const saveWin = () => {
    const t = winDraft.trim();
    if (t && t !== today.study.win) {
      actions.setStudy({ win: t });
      actions.addMemory(t);
    } else if (!t && today.study.win) {
      actions.setStudy({ win: undefined });
    }
  };

  const sleep = today.sleep;

  return (
    <AppShell title="Today" subtitle={longDate}>
      <div className="space-y-5 stagger">
        {/* Greeting */}
        <div className="card-paper p-6">
          <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Welcome back</div>
          <p className="font-display text-[32px] leading-tight tracking-tight mt-2">{greeting || "Hello, Akshay"}</p>
        </div>

        {/* LIFE companion */}
        <Companion stage={garden.stage} />

        {/* Sleep */}
        <div className="card-paper p-6">
          <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground mb-4">Sleep</div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="text-[11px] text-foreground/60 mb-1.5 flex items-center gap-1">😴 Slept at</div>
              <input
                type="time"
                value={sleep?.sleptAt ?? ""}
                onChange={(e) => actions.setSleep({ sleptAt: e.target.value || undefined })}
                className="w-full rounded-full bg-muted px-4 py-2.5 text-sm outline-none"
              />
            </label>
            <label className="block">
              <div className="text-[11px] text-foreground/60 mb-1.5 flex items-center gap-1">☀️ Woke at</div>
              <input
                type="time"
                value={sleep?.wokeAt ?? ""}
                onChange={(e) => actions.setSleep({ wokeAt: e.target.value || undefined })}
                className="w-full rounded-full bg-muted px-4 py-2.5 text-sm outline-none"
              />
            </label>
          </div>
          {sleep?.durationMinutes != null && (
            <div className="mt-3 text-[13px] text-foreground/70">Duration: <span className="font-medium text-foreground">{formatHM(sleep.durationMinutes)}</span></div>
          )}
        </div>

        {/* Mood */}
        <div className="card-paper p-6">
          <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground mb-4">How are you feeling?</div>
          <div className="grid grid-cols-4 gap-3">
            {MOODS.map((m) => {
              const active = today.mood === m.value;
              return (
                <button
                  key={m.value}
                  onClick={() => actions.setMood(m.value)}
                  className={`flex flex-col items-center gap-2 rounded-3xl py-5 press transition ${active ? "bg-sage text-[#1A1C1A] animate-mood-pop" : "bg-muted text-foreground/70"}`}
                >
                  <span className="text-[34px] leading-none">{m.emoji}</span>
                  <span className="text-[11px] font-medium">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Energy */}
        <div className="card-paper p-6">
          <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground mb-4">Energy today</div>
          <div className="flex gap-2.5">
            {ENERGIES.map((e) => {
              const active = today.energy === e.value;
              return (
                <button
                  key={e.value}
                  onClick={() => actions.setEnergy(e.value)}
                  className={`flex-1 rounded-full py-3.5 text-[15px] font-medium press transition ${active ? "bg-lavender text-[#1A1C1A]" : "bg-muted text-foreground/70"}`}
                >{e.label}</button>
              );
            })}
          </div>
        </div>

        {/* Aaj Ka Focus */}
        <div className="card-lavender p-7">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] uppercase tracking-[0.24em] text-foreground/60">Aaj Ka Focus</div>
            {today.focus && <span className="text-[11px] text-sage font-semibold">saved</span>}
          </div>
          <input
            value={focusDraft}
            onChange={(e) => setFocusDraft(e.target.value)}
            onBlur={saveFocus}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            placeholder="What's one thing for today?"
            className="w-full bg-transparent font-display text-[28px] leading-snug tracking-tight outline-none placeholder:text-foreground/30"
          />
          {!today.focus && (
            <div className="flex gap-2 flex-wrap mt-5">
              {FOCUS_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => { setFocusDraft(s); actions.setFocus(s); }}
                  className="text-[13px] rounded-full bg-card/70 px-4 py-2 press text-foreground/75"
                >{s}</button>
              ))}
            </div>
          )}
        </div>

        {/* Habits summary */}
        <Link to="/habits" className="block">
          <div className="card-paper p-6 hover-lift">
            <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Habits</div>
            <div className="flex items-baseline justify-between gap-3 mt-3">
              <div className="font-display text-[34px] leading-none">{habitDone} / {habits.length}</div>
              <div className="text-[13px] text-muted-foreground">completed today</div>
            </div>
          </div>
        </Link>

        {/* Today's agenda preview */}
        <Link to="/agenda" className="block">
          <div className="card-paper p-6 hover-lift">
            <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Today's agenda</div>
            {agendaToday.length === 0 ? (
              <div className="mt-3 text-[15px] text-muted-foreground">
                {nextEvent ? <>Nothing today. Next: <span className="text-foreground">{nextEvent.name}</span></> : "Nothing scheduled."}
              </div>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {agendaToday.slice(0, 4).map((it, i) => (
                  <li key={i} className="text-[15px] flex items-center gap-2">
                    <span className="text-xs">{it.k === "event" ? "📅" : it.done ? "✅" : "▢"}</span>
                    <span className={it.done ? "line-through text-muted-foreground" : ""}>{it.title}</span>
                  </li>
                ))}
                {agendaToday.length > 4 && <li className="text-[12px] text-muted-foreground">+{agendaToday.length - 4} more</li>}
              </ul>
            )}
          </div>
        </Link>

        {/* Win of the day */}
        <div className="card-cream p-6">
          <div className="text-[11px] uppercase tracking-[0.24em] text-foreground/55 mb-3">Win of the day</div>
          <input
            value={winDraft}
            onChange={(e) => setWinDraft(e.target.value)}
            onBlur={saveWin}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            placeholder="One small thing that went right…"
            className="w-full bg-transparent text-[17px] outline-none placeholder:text-foreground/35"
          />
          {today.study.win && <p className="text-[12px] text-foreground/55 italic mt-2">Saved to Memory Jar</p>}
        </div>

        {/* Bad day mode */}
        {!toughLogged && !toughOpen && (
          <div className="flex justify-center pt-1">
            <button
              onClick={() => setToughOpen(true)}
              className="text-[13px] text-muted-foreground underline underline-offset-2 py-2 hover:text-foreground transition"
            >Today was difficult</button>
          </div>
        )}

        {!toughLogged && toughOpen && (
          <div className="card-paper p-6 animate-fade-up">
            <p className="font-display text-[22px] tracking-tight leading-tight">Some days are about getting through.</p>
            <p className="text-[15px] text-foreground/65 mt-2">That's enough. Let's just log mood.</p>
            <div className="grid grid-cols-4 gap-2.5 mt-4">
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setToughMood(m.value)}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl py-3.5 press transition ${toughMood === m.value ? "bg-sage text-[#1A1C1A]" : "bg-muted text-foreground/70"}`}
                >
                  <span className="text-[26px] leading-none">{m.emoji}</span>
                  <span className="text-[10px]">{m.label}</span>
                </button>
              ))}
            </div>
            <textarea
              value={toughNote}
              onChange={(e) => setToughNote(e.target.value)}
              placeholder="A short note (optional)"
              rows={3}
              className="w-full mt-4 rounded-2xl bg-muted p-4 text-[15px] outline-none resize-none placeholder:text-foreground/40"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { actions.setMood(toughMood); actions.logToughDay(toughNote); setToughOpen(false); }}
                className="flex-1 rounded-full bg-sage-deep text-primary-foreground py-3 text-[15px] font-medium press"
              >Save</button>
              <button
                onClick={() => setToughOpen(false)}
                className="rounded-full bg-muted text-foreground/70 px-5 text-[15px] press"
              >Cancel</button>
            </div>
          </div>
        )}
        {toughLogged && (
          <div className="card-sage-soft p-5 text-center text-[15px] text-foreground/75 italic">
            Some days are about getting through. That's enough.
          </div>
        )}
      </div>
    </AppShell>
  );
}
