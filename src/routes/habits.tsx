import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { actions, useStore, useToday, type HabitCategory } from "@/lib/store";
import { lastNDays } from "@/lib/ist";
import { Plus, X, Check } from "lucide-react";

export const Route = createFileRoute("/habits")({
  head: () => ({ meta: [{ title: "Habits — daily." }] }),
  component: HabitsPage,
});

function emit(title: string, body?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("daily:in-app-alert", { detail: { title, body } }));
}

function HabitsPage() {
  const habits = useStore((s) => s.habits);
  const today = useToday();
  const days = useStore((s) => s.days);
  const last7 = useMemo(() => lastNDays(7), []);
  const [name, setName] = useState("");
  const [cat, setCat] = useState<HabitCategory>("non-negotiable");
  const [tab, setTab] = useState<HabitCategory>("non-negotiable");
  const [reasonFor, setReasonFor] = useState<string | null>(null);
  const [reasonText, setReasonText] = useState("");

  const list = habits.filter((h) => h.category === tab);

  return (
    <AppShell title="Habits">
      <div className="space-y-4 stagger">
        <div className="flex justify-center -mt-2 mb-1"><HabitsPlant className="h-20 w-20" /></div>
        <div className="flex gap-2">
          <Tab active={tab === "non-negotiable"} onClick={() => setTab("non-negotiable")}>Non-Negotiable</Tab>
          <Tab active={tab === "adapting"} onClick={() => setTab("adapting")}>Trying to Adapt</Tab>
        </div>

        <div className="card-paper p-4">
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New habit"
              className="flex-1 rounded-full bg-muted px-4 py-2.5 text-sm outline-none placeholder:text-foreground/40"
            />
            <select value={cat} onChange={(e) => setCat(e.target.value as HabitCategory)} className="rounded-full bg-muted px-3 text-xs outline-none">
              <option value="non-negotiable">Non-Neg.</option>
              <option value="adapting">Adapting</option>
            </select>
            <button
              onClick={() => { if (name.trim()) { actions.addHabit(name.trim(), cat); setName(""); } }}
              className="rounded-full bg-amber text-[#0A0A0A] px-4 py-2.5 press"
            ><Plus size={14} /></button>
          </div>
        </div>

        <div className="space-y-2.5 stagger">
          {list.length === 0 && <div className="card-paper py-8 text-center text-sm text-muted-foreground italic">No habits here yet.</div>}
          {list.map((h) => {
            const log = today.habits[h.id];
            const done = !!log?.done;
            const missed = log && !log.done;
            const week = last7.map((k) => ({ k, done: !!days[k]?.habits[h.id]?.done }));
            return (
              <div key={h.id} className={`p-4 transition ${done ? "card-amber" : missed ? "card-blush" : "card-paper"}`}>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-[15px] font-medium">{h.name}</p>
                    {missed && log?.reason && <p className="text-xs text-muted-foreground italic mt-0.5">"{log.reason}"</p>}
                  </div>
                  <button
                    onClick={() => { actions.toggleHabit(h.id, true); emit("Done! 🌱", h.name); }}
                    aria-label="Done"
                    className={`h-9 w-9 rounded-full border-2 flex items-center justify-center press ${done ? "bg-success border-success text-white" : "border-foreground/25 hover:border-success"}`}
                  >{done && <Check size={16} className="animate-tick" />}</button>
                  <button
                    onClick={() => { setReasonFor(reasonFor === h.id ? null : h.id); setReasonText(log?.reason ?? ""); }}
                    aria-label="Missed"
                    className={`h-9 w-9 rounded-full border-2 flex items-center justify-center press ${missed ? "bg-destructive border-destructive text-destructive-foreground" : "border-foreground/25 hover:border-destructive"}`}
                  >{missed ? <X size={16} className="animate-tick" /> : <X size={14} className="opacity-40" />}</button>
                  <button onClick={() => actions.removeHabit(h.id)} className="text-foreground/30 hover:text-foreground transition ml-1"><X size={12} /></button>
                </div>
                {/* 7-day consistency dots */}
                <div className="flex items-center gap-1.5 mt-3">
                  {week.map((d) => (
                    <span key={d.k} className={`h-2 w-2 rounded-full ${d.done ? "bg-success" : "bg-foreground/15"}`} />
                  ))}
                  <span className="text-[10px] text-muted-foreground ml-1">{week.filter((d) => d.done).length}/7</span>
                </div>
                {reasonFor === h.id && (
                  <div className="mt-3 flex gap-2 animate-fade-up">
                    <input
                      autoFocus
                      value={reasonText}
                      onChange={(e) => setReasonText(e.target.value)}
                      placeholder="What got in the way? No judgment."
                      className="flex-1 rounded-full bg-muted px-3 py-2 text-xs outline-none placeholder:text-foreground/40"
                    />
                    <button
                      onClick={() => { actions.toggleHabit(h.id, false, reasonText); setReasonFor(null); }}
                      className="rounded-full bg-foreground px-3 py-2 text-xs text-background press"
                    >Save</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

function Tab({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-xs font-semibold transition press ${active ? "bg-amber text-[#0A0A0A]" : "card-paper text-foreground"}`}
    >{children}</button>
  );
}
