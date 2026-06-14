import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Forest } from "@/components/Forest";
import { actions, useStore, useToday } from "@/lib/store";
import { istDateKey, istGreeting } from "@/lib/ist";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Today — LIFE" }] }),
  component: TodayPage,
});

function TodayPage() {
  const today = useToday();
  // touch garden so it recomputes on view
  useStore((s) => s.garden);
  const jar = useStore((s) => s.memoryJar ?? []);
  const todayKey = istDateKey();
  const todaysWin = useMemo(() => jar.find((m) => m.dateKey === todayKey), [jar, todayKey]);

  const [greeting, setGreeting] = useState("");
  useEffect(() => { setGreeting(istGreeting("Akshay")); }, []);

  const [winDraft, setWinDraft] = useState(todaysWin?.text ?? "");
  useEffect(() => { setWinDraft(todaysWin?.text ?? ""); }, [todaysWin?.text]);

  const [toughOpen, setToughOpen] = useState(false);
  const [toughNote, setToughNote] = useState("");
  const toughLogged = !!today.toughDay;

  const saveWin = () => {
    const t = winDraft.trim();
    if (t === (todaysWin?.text ?? "")) return;
    actions.setTodayWin(t);
  };

  const sleep = today.sleep;

  return (
    <AppShell title="Today" subtitle={greeting || "\u00a0"}>
      <div className="space-y-5 stagger">
        {/* Forest — the heart of the app */}
        <Forest />

        {/* Sleep routine — store only Slept At + Woke At, no analytics */}
        <div className="card-paper p-6">
          <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground mb-4">Sleep routine</div>
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
              <div className="text-[11px] text-foreground/60 mb-1.5 flex items-center gap-1">☀️ Woke up at</div>
              <input
                type="time"
                value={sleep?.wokeAt ?? ""}
                onChange={(e) => actions.setSleep({ wokeAt: e.target.value || undefined })}
                className="w-full rounded-full bg-muted px-4 py-2.5 text-sm outline-none"
              />
            </label>
          </div>
        </div>

        {/* Win of the day — single source of truth: Memory Jar */}
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
          {todaysWin && <p className="text-[12px] text-foreground/55 italic mt-2">Saved to Memory Jar</p>}
        </div>

        {/* Bad day mode — gentle note only, no mood tracking */}
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
            <p className="text-[15px] text-foreground/65 mt-2">That's enough. No need to do more.</p>
            <textarea
              value={toughNote}
              onChange={(e) => setToughNote(e.target.value)}
              placeholder="A short note (optional)"
              rows={3}
              className="w-full mt-4 rounded-2xl bg-muted p-4 text-[15px] outline-none resize-none placeholder:text-foreground/40"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { actions.logToughDay(toughNote); setToughOpen(false); }}
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
