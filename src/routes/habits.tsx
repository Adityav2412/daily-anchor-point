import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { actions, useStore, useToday, type HabitCategory } from "@/lib/store";
import { Plus, X, Check } from "lucide-react";

export const Route = createFileRoute("/habits")({
  head: () => ({ meta: [{ title: "Habits — daily." }] }),
  component: HabitsPage,
});

const PASTELS = ["card-mint", "card-sky", "card-peach", "card-lavender", "card-butter", "card-blush"];

function HabitsPage() {
  const habits = useStore((s) => s.habits);
  const today = useToday();
  const [name, setName] = useState("");
  const [cat, setCat] = useState<HabitCategory>("non-negotiable");
  const [tab, setTab] = useState<HabitCategory>("non-negotiable");
  const [reasonFor, setReasonFor] = useState<string | null>(null);
  const [reasonText, setReasonText] = useState("");

  const list = habits.filter((h) => h.category === tab);

  return (
    <AppShell title="Habits">
      <div className="space-y-4 stagger">
        <div className="flex gap-2">
          <Tab active={tab === "non-negotiable"} onClick={() => setTab("non-negotiable")}>Non-Negotiable</Tab>
          <Tab active={tab === "adapting"} onClick={() => setTab("adapting")}>Trying to Adapt</Tab>
        </div>

        <div className="card-paper rounded-[24px] p-4">
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
              className="rounded-full bg-foreground text-background px-4 py-2.5 press"
            ><Plus size={14} /></button>
          </div>
        </div>

        <div className="space-y-2.5 stagger">
          {list.length === 0 && <div className="card-paper rounded-2xl py-8 text-center text-sm text-muted-foreground italic">No habits here yet.</div>}
          {list.map((h, i) => {
            const log = today.habits[h.id];
            const done = !!log?.done;
            return (
              <div key={h.id} className={`rounded-2xl p-4 transition ${done ? PASTELS[i % PASTELS.length] : "card-paper"}`}>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (done) actions.toggleHabit(h.id, false);
                      else { setReasonFor(null); actions.toggleHabit(h.id, true); }
                    }}
                    className={`h-7 w-7 rounded-full border-2 flex items-center justify-center press ${done ? "bg-foreground border-foreground text-background" : "border-foreground/30"}`}
                  >{done && <Check size={14} />}</button>
                  <div className="flex-1">
                    <p className="text-[15px] font-medium">{h.name}</p>
                    {!done && log?.reason && <p className="text-xs text-muted-foreground italic mt-0.5">"{log.reason}"</p>}
                  </div>
                  {!done && (
                    <button
                      onClick={() => { setReasonFor(h.id); setReasonText(log?.reason ?? ""); }}
                      className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition"
                    >note</button>
                  )}
                  <button onClick={() => actions.removeHabit(h.id)} className="text-foreground/30 hover:text-foreground transition"><X size={14} /></button>
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
      className={`rounded-full px-4 py-2 text-xs font-semibold transition press ${active ? "bg-foreground text-background" : "card-paper text-foreground"}`}
    >{children}</button>
  );
}
