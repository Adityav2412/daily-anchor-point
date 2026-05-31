import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { actions, useToday } from "@/lib/store";
import { Plus, X, Flame } from "lucide-react";

export const Route = createFileRoute("/tasks")({
  head: () => ({ meta: [{ title: "Tasks — FocusFlow" }] }),
  component: TasksPage,
});

function TasksPage() {
  const today = useToday();
  const [scope, setScope] = useState<"today" | "tomorrow">("today");
  const [title, setTitle] = useState("");
  const [high, setHigh] = useState(false);
  const list = scope === "today" ? today.tasksToday : today.tasksTomorrow;

  return (
    <AppShell title="Tasks" subtitle="1–3 real priorities is plenty.">
      <div className="flex gap-2 mb-4">
        <button onClick={() => setScope("today")} className={`flex-1 rounded-full py-2 text-sm font-medium ${scope === "today" ? "bg-primary text-primary-foreground" : "bg-white border"}`}>Today</button>
        <button onClick={() => setScope("tomorrow")} className={`flex-1 rounded-full py-2 text-sm font-medium ${scope === "tomorrow" ? "bg-primary text-primary-foreground" : "bg-white border"}`}>Tomorrow</button>
      </div>

      <div className="card-soft border p-4 mb-4">
        <div className="flex gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task" className="flex-1 rounded-full bg-secondary px-4 py-2 text-sm outline-none" />
          <button onClick={() => setHigh(!high)} className={`rounded-full px-3 ${high ? "bg-[var(--danger)] text-white" : "bg-secondary"}`} title="High priority"><Flame size={14} /></button>
          <button
            onClick={() => { if (title.trim()) { actions.addTask(scope, title.trim(), high ? "high" : "normal"); setTitle(""); setHigh(false); } }}
            className="rounded-full bg-primary px-4 text-primary-foreground"
          ><Plus size={14} /></button>
        </div>
        <p className="text-[11px] text-foreground/60 mt-2">{scope === "tomorrow" ? "Auto-moves to Today at 12:00 AM IST." : "Today's plan."}</p>
      </div>

      <ul className="space-y-2">
        {list.length === 0 && <p className="text-sm text-foreground/60 text-center py-8">Nothing here. That's okay.</p>}
        {list.map((t) => (
          <li key={t.id} className={`card-soft border p-3 flex items-center gap-3 ${t.priority === "high" ? "border-[color:var(--danger)]/40" : ""}`}>
            <button
              onClick={() => actions.toggleTask(scope, t.id)}
              className={`w-6 h-6 rounded-full border-2 ${t.done ? "bg-primary border-primary" : "border-foreground/30"}`}
            />
            <span className={`flex-1 text-sm ${t.done ? "line-through text-foreground/40" : ""} ${t.priority === "high" ? "text-[color:var(--danger)] font-medium" : ""}`}>{t.title}</span>
            {t.priority === "high" && <Flame size={14} className="text-[color:var(--danger)]" />}
            <button onClick={() => actions.removeTask(scope, t.id)} className="text-foreground/40"><X size={14} /></button>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
