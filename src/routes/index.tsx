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
  "Finish one important task",
  "Go for a walk",
  "Study for 30 minutes",
];

function TodayPage() {
  const today = useToday();
  const habits = useStore((s) => s.habits);
  const events = useStore((s) => s.events ?? []);
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
  const tasksLeft = today.tasksToday.filter((t) => !t.done).length;
  const studyMin = (today.study.sessions ?? []).reduce((a, s) => a + s.durationMin, 0);

  const upcoming = useMemo(() => {
    const tk = istDateKey();
    return [...events]
      .filter((e) => e.date >= tk)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
  }, [events]);
  const upcomingDiff = upcoming ? daysBetween(upcoming.date) : null;

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

  return (
    <AppShell title="Today" subtitle={longDate}>
      <div className="space-y-4 stagger">
        {/* Greeting */}
        <div className="card-paper p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Welcome back</div>
          <p className="font-display text-[26px] leading-tight tracking-tight mt-1">{greeting || "Hello, Akshay"}</p>
        </div>

        {/* Aaj Ka Focus — prominent, right under greeting */}
        <div className="card-lavender p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/60">Aaj Ka Focus</div>
            {today.focus && <span className="text-[10px] text-sage font-semibold">saved</span>}
          </div>
          <input
            value={focusDraft}
            onChange={(e) => setFocusDraft(e.target.value)}
            onBlur={saveFocus}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            placeholder="What's one thing for today?"
            className="w-full bg-transparent font-display text-[22px] leading-snug tracking-tight outline-none placeholder:text-foreground/30"
          />
          {!today.focus && (
            <div className="flex gap-1.5 flex-wrap mt-3">
              {FOCUS_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => { setFocusDraft(s); actions.setFocus(s); }}
                  className="text-[11px] rounded-full bg-card/70 px-3 py-1.5 press text-foreground/70"
                >{s}</button>
              ))}
            </div>
          )}
        </div>

        {/* LIFE companion */}
        <Companion stage={garden.stage} />

        {/* Mood */}
        <div className="card-paper p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">How are you feeling?</div>
          <div className="grid grid-cols-4 gap-2">
            {MOODS.map((m) => {
              const active = today.mood === m.value;
              return (
                <button
                  key={m.value}
                  onClick={() => actions.setMood(m.value)}
                  className={`flex flex-col items-center gap-1 rounded-2xl py-3 press transition ${active ? "bg-sage text-[#1A1C1A]" : "bg-muted text-foreground/70"}`}
                >
                  <span className="text-2xl">{m.emoji}</span>
                  <span className="text-[10px] font-medium">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Energy */}
        <div className="card-paper p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">Energy today</div>
          <div className="flex gap-2">
            {ENERGIES.map((e) => {
              const active = today.energy === e.value;
              return (
                <button
                  key={e.value}
                  onClick={() => actions.setEnergy(e.value)}
                  className={`flex-1 rounded-full py-2.5 text-sm font-medium press transition ${active ? "bg-lavender text-[#1A1C1A]" : "bg-muted text-foreground/70"}`}
                >{e.label}</button>
              );
            })}
          </div>
        </div>

        {/* Daily snapshot */}
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Habits" value={`${habitDone}/${habits.length}`} to="/habits" />
          <Stat label="Study" value={formatHM(studyMin) || "—"} to="/study" />
          <Stat label="Tasks left" value={String(tasksLeft)} to="/tasks" />
          <Stat
            label="Next event"
            value={upcoming ? labelDiff(upcomingDiff!) : "—"}
            sublabel={upcoming?.name}
            to="/calendar"
          />
        </div>

        {/* Win of the day */}
        <div className="card-cream p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/55 mb-2">Win of the day</div>
          <input
            value={winDraft}
            onChange={(e) => setWinDraft(e.target.value)}
            onBlur={saveWin}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            placeholder="One small thing that went right…"
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-foreground/35"
          />
          {today.study.win && <p className="text-[11px] text-foreground/55 italic mt-1">Saved to Memory Jar</p>}
        </div>

        {/* Bad day mode */}
        {!toughLogged && !toughOpen && (
          <button
            onClick={() => setToughOpen(true)}
            className="block w-full text-center text-[12px] text-muted-foreground underline underline-offset-2 py-1 hover:text-foreground transition"
          >
            Today was difficult
          </button>
        )}
        {!toughLogged && toughOpen && (
          <div className="card-paper p-5 animate-fade-up">
            <p className="font-display text-lg tracking-tight">Some days are about getting through.</p>
            <p className="text-sm text-foreground/65 mt-1">That's enough. Let's just log mood.</p>
            <div className="grid grid-cols-4 gap-2 mt-3">
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setToughMood(m.value)}
                  className={`flex flex-col items-center gap-1 rounded-2xl py-2.5 press transition ${toughMood === m.value ? "bg-sage text-[#1A1C1A]" : "bg-muted text-foreground/70"}`}
                >
                  <span className="text-xl">{m.emoji}</span>
                  <span className="text-[9px]">{m.label}</span>
                </button>
              ))}
            </div>
            <textarea
              value={toughNote}
              onChange={(e) => setToughNote(e.target.value)}
              placeholder="A short note (optional)"
              rows={2}
              className="w-full mt-3 rounded-2xl bg-muted p-3 text-sm outline-none resize-none placeholder:text-foreground/40"
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => { actions.setMood(toughMood); actions.logToughDay(toughNote); setToughOpen(false); }}
                className="flex-1 rounded-full bg-sage-deep text-primary-foreground py-2.5 text-sm font-medium press"
              >Save</button>
              <button
                onClick={() => setToughOpen(false)}
                className="rounded-full bg-muted text-foreground/70 px-4 text-sm press"
              >Cancel</button>
            </div>
          </div>
        )}
        {toughLogged && (
          <div className="card-sage-soft p-4 text-center text-sm text-foreground/75 italic">
            Some days are about getting through. That's enough.
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Stat({ label, value, sublabel, to }: { label: string; value: string; sublabel?: string; to?: string }) {
  const inner = (
    <div className="card-paper p-4 hover-lift h-full">
      <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
      <div className="font-display text-3xl leading-none mt-2">{value}</div>
      {sublabel && <div className="text-[11px] text-muted-foreground mt-1 truncate">{sublabel}</div>}
    </div>
  );
  return to ? <Link to={to as any} className="block">{inner}</Link> : inner;
}

function daysBetween(dateKey: string): number {
  const today = istDateKey();
  const [ty, tm, td] = today.split("-").map(Number);
  const [y, m, d] = dateKey.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86400000);
}
function labelDiff(diff: number) {
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  return `in ${diff}d`;
}
