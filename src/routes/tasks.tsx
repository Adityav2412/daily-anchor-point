import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { actions, useToday } from "@/lib/store";
import { Plus, X, Flame } from "lucide-react";

export const Route = createFileRoute("/tasks")({
  head: () => ({ meta: [{ title: "Tasks — daily." }] }),
  component: TasksPage,
});

function TasksPage() {
  const today = useToday();
  const [scope, setScope] = useState<"today" | "tomorrow">("today");
  const [title, setTitle] = useState("");
  const [high, setHigh] = useState(false);
  const list = scope === "today" ? today.tasksToday : today.tasksTomorrow;

  return (
    <AppShell title="Tasks">
      <div className="space-y-4 stagger">
        <div className="flex gap-2">
          <button onClick={() => setScope("today")} className={`flex-1 rounded-full py-2.5 text-sm font-semibold press transition ${scope === "today" ? "bg-foreground text-background" : "card-paper"}`}>Today</button>
          <button onClick={() => setScope("tomorrow")} className={`flex-1 rounded-full py-2.5 text-sm font-semibold press transition ${scope === "tomorrow" ? "bg-foreground text-background" : "card-paper"}`}>Tomorrow</button>
        </div>

        <div className="card-paper rounded-[24px] p-4">
          <div className="flex gap-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task" className="flex-1 rounded-full bg-muted px-4 py-2.5 text-sm outline-none placeholder:text-foreground/40" />
            <button onClick={() => setHigh(!high)} className={`rounded-full px-3 press transition ${high ? "bg-destructive text-destructive-foreground" : "bg-muted"}`} title="High priority"><Flame size={14} /></button>
            <button
              onClick={() => { if (title.trim()) { actions.addTask(scope, title.trim(), high ? "high" : "normal"); setTitle(""); setHigh(false); } }}
              className="rounded-full bg-foreground text-background px-4 press"
            ><Plus size={14} /></button>
          </div>
          <p className="text-[11px] text-muted-foreground italic mt-2 px-1">
            {scope === "tomorrow" ? "Auto-moves to Today at 12:00 AM IST." : "1–3 real priorities is plenty."}
          </p>
        </div>

        <div className="space-y-2.5 stagger">
          {list.length === 0 && <div className="card-paper rounded-2xl py-8 text-center text-sm text-muted-foreground italic">Nothing here. That's okay.</div>}
          {list.map((t) => (
            <button
              key={t.id}
              onClick={() => actions.toggleTask(scope, t.id)}
              className={`w-full flex items-center gap-3 rounded-2xl p-4 text-left press ${t.priority === "high" ? "card-blush" : "card-paper"}`}
            >
              <span className={`h-6 w-6 rounded-full border-2 flex items-center justify-center text-[12px] transition ${t.done ? "bg-foreground border-foreground text-background" : "border-foreground/30"}`}>
                {t.done && "✓"}
              </span>
              <span className={`flex-1 text-[15px] ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.title}</span>
              {t.priority === "high" && <span className="text-[10px] uppercase tracking-wider text-destructive font-bold">🔥 High</span>}
              <span onClick={(e) => { e.stopPropagation(); actions.removeTask(scope, t.id); }} className="text-foreground/30 hover:text-foreground transition"><X size={14} /></span>
            </button>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
