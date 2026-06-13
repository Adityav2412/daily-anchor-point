import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { actions, useStore, useToday, type TaskCategory, type ReminderOffset, type TaskItem } from "@/lib/store";
import { istDateKey } from "@/lib/ist";
import { Plus, X, Check, Bell, BellOff, Flame, Trash2 } from "lucide-react";

export const Route = createFileRoute("/tasks")({
  head: () => ({ meta: [{ title: "Tasks — LIFE" }] }),
  component: TasksPage,
});

const CATEGORIES: { v: TaskCategory; label: string; tint: string }[] = [
  { v: "health", label: "Health", tint: "bg-pastel-sage" },
  { v: "personal", label: "Personal", tint: "bg-pastel-lavender" },
  { v: "study", label: "Study", tint: "bg-pastel-cream" },
  { v: "general", label: "General", tint: "bg-muted" },
];
const REMIND_OPTS: { v: ReminderOffset; label: string }[] = [
  { v: 0, label: "At time" },
  { v: 15, label: "15 min" },
  { v: 60, label: "1 hr" },
  { v: 1440, label: "1 day" },
];

type Scope = "today" | "tomorrow" | "upcoming";

function TasksPage() {
  const today = useToday();
  const [scope, setScope] = useState<Scope>("today");
  const [askPerm, setAskPerm] = useState(typeof Notification !== "undefined" && Notification.permission !== "granted");

  const list = scope === "today" ? today.tasksToday : scope === "tomorrow" ? today.tasksTomorrow : (today.tasksUpcoming ?? []);

  return (
    <AppShell title="Tasks" subtitle="Simple, just what's next.">
      <div className="space-y-4 stagger">
        <div className="flex gap-2">
          {(["today", "tomorrow", "upcoming"] as Scope[]).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`flex-1 rounded-full py-2 text-xs font-semibold uppercase tracking-wider press transition ${scope === s ? "bg-sage text-[#1A1C1A]" : "card-paper text-foreground/70"}`}
            >{s}</button>
          ))}
        </div>

        {askPerm && (
          <button
            onClick={async () => { const p = await Notification.requestPermission(); setAskPerm(p !== "granted"); }}
            className="w-full card-lavender p-3 text-xs text-left flex items-center gap-2 press"
          >
            <Bell size={13} /> Enable notifications for reminders
          </button>
        )}

        <AddForm scope={scope} />

        <div className="space-y-2.5 stagger">
          {list.length === 0 ? (
            <div className="card-paper py-10 text-center text-sm text-muted-foreground italic">
              Nothing here. That's okay.
            </div>
          ) : (
            list.map((t) => <TaskRow key={t.id} task={t} scope={scope} />)
          )}
        </div>
      </div>
    </AppShell>
  );
}

function AddForm({ scope }: { scope: Scope }) {
  const [title, setTitle] = useState("");
  const [cat, setCat] = useState<TaskCategory>("general");
  const [high, setHigh] = useState(false);
  const [due, setDue] = useState("");
  const [offset, setOffset] = useState<ReminderOffset | null>(null);
  const [timeStr, setTimeStr] = useState("");

  const tomorrowKey = useMemo(() => {
    const [y, m, d] = istDateKey().split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + 1));
    return dt.toISOString().slice(0, 10);
  }, []);

  const add = () => {
    if (!title.trim()) return;
    let remindIso: string | undefined;
    if (scope === "today" && timeStr) {
      const [hh, mm] = timeStr.split(":").map(Number);
      const d = new Date();
      d.setHours(hh || 0, mm || 0, 0, 0);
      remindIso = d.toISOString();
    }
    actions.addTask(scope, title.trim(), high ? "high" : "normal", undefined, remindIso, {
      category: cat,
      reminderOffsetMin: offset ?? undefined,
      dueDate: scope === "upcoming" ? (due || undefined) : undefined,
    });
    setTitle(""); setHigh(false); setDue(""); setOffset(null); setTimeStr("");
  };

  return (
    <div className="card-paper p-4 space-y-2.5">
      <div className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          placeholder={`Add ${scope} task`}
          className="flex-1 rounded-full bg-muted px-4 py-2.5 text-sm outline-none placeholder:text-foreground/40"
        />
        <button onClick={() => setHigh(!high)} title="High priority" className={`rounded-full px-3 press ${high ? "bg-amber text-[#1A1C1A]" : "bg-muted"}`}>
          <Flame size={14} />
        </button>
        <button onClick={add} className="rounded-full bg-sage-deep text-primary-foreground px-4 press"><Plus size={14} /></button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <button key={c.v} onClick={() => setCat(c.v)} className={`text-[11px] rounded-full px-3 py-1 press ${cat === c.v ? "bg-lavender text-[#1A1C1A]" : "bg-muted text-foreground/70"}`}>{c.label}</button>
        ))}
      </div>
      {scope === "upcoming" && (
        <input
          type="date"
          value={due}
          min={tomorrowKey}
          onChange={(e) => setDue(e.target.value)}
          className="w-full rounded-full bg-muted px-4 py-2 text-sm outline-none"
        />
      )}
      {scope === "today" && (
        <div className="flex items-center gap-2 flex-wrap">
          <Bell size={12} className="text-muted-foreground" />
          <input
            type="time"
            value={timeStr}
            onChange={(e) => setTimeStr(e.target.value)}
            className="rounded-full bg-muted px-3 py-1.5 text-xs outline-none"
          />
          {REMIND_OPTS.map((o) => (
            <button
              key={o.v}
              onClick={() => setOffset(offset === o.v ? null : o.v)}
              className={`text-[10px] rounded-full px-2.5 py-1 press ${offset === o.v ? "bg-lavender text-[#1A1C1A]" : "bg-muted text-foreground/60"}`}
            >{o.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, scope }: { task: TaskItem; scope: Scope }) {
  const catLabel = task.category ? CATEGORIES.find((c) => c.v === task.category)?.label : "";
  return (
    <div className={`p-4 ${task.priority === "high" ? "card-peach" : "card-paper"}`}>
      <div className="flex items-center gap-3">
        <button
          onClick={() => actions.toggleTask(scope, task.id)}
          className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 press transition ${task.done ? "bg-sage-deep text-primary-foreground" : "bg-card/60 border border-foreground/20"}`}
        >{task.done && <Check size={13} className="animate-tick" />}</button>
        <div className="flex-1 min-w-0">
          <p className={`text-[15px] ${task.done ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5 flex-wrap">
            {catLabel && <span>{catLabel}</span>}
            {task.dueDate && <span>· due {task.dueDate}</span>}
            {task.remindAt ? (
              <span className="flex items-center gap-0.5"><Bell size={10} /> {new Date(task.remindAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
            ) : task.reminderOffsetMin != null ? (
              <span className="flex items-center gap-0.5"><Bell size={10} /> {REMIND_OPTS.find((o) => o.v === task.reminderOffsetMin)?.label}</span>
            ) : (
              <span className="flex items-center gap-0.5 opacity-50"><BellOff size={10} /></span>
            )}
            {task.priority === "high" && <span className="text-amber">🔥</span>}
          </div>
        </div>
        <button onClick={() => actions.removeTask(scope, task.id)} className="text-foreground/30 hover:text-foreground transition press">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
