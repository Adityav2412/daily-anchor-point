import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { actions, useStore, useToday, type HabitCategory } from "@/lib/store";
import { Plus, X, Check } from "lucide-react";

export const Route = createFileRoute("/habits")({
  head: () => ({ meta: [{ title: "Habits — FocusFlow" }] }),
  component: HabitsPage,
});

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
    <AppShell title="Habits" subtitle="Carries forward every day.">
      <div className="flex gap-2 mb-4">
        <Tab active={tab === "non-negotiable"} onClick={() => setTab("non-negotiable")}>Non-Negotiable</Tab>
        <Tab active={tab === "adapting"} onClick={() => setTab("adapting")}>Trying to Adapt</Tab>
      </div>

      <div className="card-soft border p-4 mb-4">
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New habit name"
            className="flex-1 rounded-full bg-secondary px-4 py-2 text-sm outline-none"
          />
          <select value={cat} onChange={(e) => setCat(e.target.value as HabitCategory)} className="rounded-full bg-secondary px-3 text-xs">
            <option value="non-negotiable">Non-Negotiable</option>
            <option value="adapting">Adapting</option>
          </select>
          <button
            onClick={() => { if (name.trim()) { actions.addHabit(name.trim(), cat); setName(""); } }}
            className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground flex items-center gap-1"
          ><Plus size={14} /></button>
        </div>
      </div>

      <ul className="space-y-3">
        {list.length === 0 && <p className="text-sm text-foreground/60 text-center py-8">No habits here yet.</p>}
        {list.map((h) => {
          const log = today.habits[h.id];
          const done = !!log?.done;
          return (
            <li key={h.id} className={`card-soft p-4 border ${done ? "bg-[var(--mint)]" : ""}`}>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (done) actions.toggleHabit(h.id, false);
                    else { setReasonFor(null); actions.toggleHabit(h.id, true); }
                  }}
                  className={`w-7 h-7 rounded-full flex items-center justify-center border-2 ${done ? "bg-primary border-primary text-primary-foreground" : "border-foreground/30"}`}
                >{done && <Check size={14} />}</button>
                <div className="flex-1">
                  <p className="text-sm font-medium">{h.name}</p>
                  {!done && log?.reason && <p className="text-xs text-foreground/60 mt-0.5">Note: {log.reason}</p>}
                </div>
                {!done && (
                  <button
                    onClick={() => { setReasonFor(h.id); setReasonText(log?.reason ?? ""); }}
                    className="text-xs underline text-foreground/60"
                  >Add note</button>
                )}
                <button onClick={() => actions.removeHabit(h.id)} className="text-foreground/40 hover:text-foreground"><X size={14} /></button>
              </div>
              {reasonFor === h.id && (
                <div className="mt-3 flex gap-2">
                  <input
                    autoFocus
                    value={reasonText}
                    onChange={(e) => setReasonText(e.target.value)}
                    placeholder="What got in the way? (just a note, no judgment)"
                    className="flex-1 rounded-full bg-secondary px-3 py-2 text-xs outline-none"
                  />
                  <button
                    onClick={() => { actions.toggleHabit(h.id, false, reasonText); setReasonFor(null); }}
                    className="rounded-full bg-primary px-3 py-2 text-xs text-primary-foreground"
                  >Save</button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}

function Tab({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-xs font-medium ${active ? "bg-primary text-primary-foreground" : "bg-white border"}`}
    >{children}</button>
  );
}
