import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { actions, useStore, type EventOffset, type ReminderOffset, type TaskItem, type CalendarEvent } from "@/lib/store";
import { istDateKey, formatISTDate, nowIST } from "@/lib/ist";
import { Plus, Trash2, Check, Bell, X, ChevronLeft, ChevronRight, Calendar as CalIcon, CheckSquare } from "lucide-react";

export const Route = createFileRoute("/agenda")({
  head: () => ({ meta: [{ title: "Agenda — LIFE" }] }),
  component: AgendaPage,
});

const EVT_CATS = ["Health", "Birthday", "Family", "Travel", "Deadline", "Bill", "Other"];
const EVT_REMINDERS: { v: EventOffset; label: string }[] = [
  { v: 0, label: "Day of" },
  { v: 1440, label: "1d before" },
  { v: 4320, label: "3d before" },
  { v: 10080, label: "1w before" },
];
const TASK_REMINDERS: { v: ReminderOffset; label: string }[] = [
  { v: 0, label: "At time" },
  { v: 15, label: "15 min" },
  { v: 60, label: "1 hr" },
  { v: 1440, label: "1 day" },
];

function pad(n: number) { return String(n).padStart(2, "0"); }
function keyOf(y: number, m: number, d: number) { return `${y}-${pad(m + 1)}-${pad(d)}`; }
function parseKey(k: string) { const [y, m, d] = k.split("-").map(Number); return { y, m: m - 1, d }; }

function AgendaPage() {
  const events = useStore((s) => s.events ?? []);
  const days = useStore((s) => s.days);
  const todayKey = istDateKey();
  const [selected, setSelected] = useState(todayKey);
  const sel = parseKey(selected);
  const [viewYear, setViewYear] = useState(sel.y);
  const [viewMonth, setViewMonth] = useState(sel.m);
  const [mode, setMode] = useState<"month" | "week">("month");
  const [adding, setAdding] = useState<"event" | "task" | null>(null);

  // Month grid (Monday-first)
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const dow = firstOfMonth.getDay();
  const leading = (dow + 6) % 7;
  const monthCells: ({ k: string; d: number } | null)[] = [];
  for (let i = 0; i < leading; i++) monthCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) monthCells.push({ k: keyOf(viewYear, viewMonth, d), d });
  while (monthCells.length % 7 !== 0) monthCells.push(null);

  // Week strip (Monday-first) containing selected
  const selDate = new Date(sel.y, sel.m, sel.d);
  const selDow = (selDate.getDay() + 6) % 7;
  const weekStart = new Date(selDate);
  weekStart.setDate(selDate.getDate() - selDow);
  const weekCells: { k: string; d: number; m: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const wd = new Date(weekStart);
    wd.setDate(weekStart.getDate() + i);
    weekCells.push({ k: keyOf(wd.getFullYear(), wd.getMonth(), wd.getDate()), d: wd.getDate(), m: wd.getMonth() });
  }


  // Events / tasks for selected day
  const dayEvents = useMemo(() => events.filter((e) => e.date === selected), [events, selected]);
  const dayData = days[selected];
  const dayTasks: TaskItem[] = [];
  if (dayData) dayTasks.push(...dayData.tasksToday);
  for (const k of Object.keys(days)) {
    for (const t of days[k].tasksUpcoming ?? []) {
      if (t.dueDate === selected) dayTasks.push(t);
    }
  }

  // Mark dots
  const hasItems = (k: string) => {
    if (events.some((e) => e.date === k)) return true;
    const dd = days[k];
    if (dd && dd.tasksToday.length) return true;
    for (const kk of Object.keys(days)) {
      if ((days[kk].tasksUpcoming ?? []).some((t) => t.dueDate === k)) return true;
    }
    return false;
  };

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const navMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  return (
    <AppShell title="Agenda" subtitle="Events and tasks, on a date.">
      <div className="space-y-5 stagger">
        {/* Month grid */}
        <div className="card-paper p-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => navMonth(-1)} className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center press"><ChevronLeft size={14} /></button>
            <div className="font-display text-[18px]">{monthLabel}</div>
            <button onClick={() => navMonth(1)} className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center press"><ChevronRight size={14} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground mb-1">
            {["M","T","W","T","F","S","S"].map((d, i) => <div key={i}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((c, i) => {
              if (!c) return <div key={i} />;
              const isSel = c.k === selected;
              const isToday = c.k === todayKey;
              const dot = hasItems(c.k);
              return (
                <button
                  key={i}
                  onClick={() => setSelected(c.k)}
                  className={`aspect-square rounded-xl text-[13px] flex flex-col items-center justify-center press transition ${
                    isSel ? "bg-sage text-[#1A1C1A] font-semibold" : isToday ? "bg-lavender/40 text-foreground" : "hover:bg-muted/50"
                  }`}
                >
                  <span>{c.d}</span>
                  {dot && <span className={`mt-0.5 h-1 w-1 rounded-full ${isSel ? "bg-[#1A1C1A]" : "bg-sage-deep"}`} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected day header */}
        <div className="flex items-center justify-between px-1">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              {selected === todayKey ? "Today" : ""}
            </div>
            <h2 className="font-display text-[22px] tracking-tight">{formatISTDate(selected)}</h2>
          </div>
          {!adding && (
            <div className="flex gap-2">
              <button onClick={() => setAdding("event")} className="rounded-full bg-lavender text-[#1A1C1A] px-3 py-1.5 text-xs font-semibold press flex items-center gap-1">
                <CalIcon size={12} /> Event
              </button>
              <button onClick={() => setAdding("task")} className="rounded-full bg-sage text-[#1A1C1A] px-3 py-1.5 text-xs font-semibold press flex items-center gap-1">
                <CheckSquare size={12} /> Task
              </button>
            </div>
          )}
        </div>

        {adding === "event" && <AddEventForm date={selected} onDone={() => setAdding(null)} />}
        {adding === "task" && <AddTaskForm date={selected} todayKey={todayKey} onDone={() => setAdding(null)} />}

        {/* Events */}
        {dayEvents.length > 0 && (
          <section>
            <h3 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-2 px-1">Events</h3>
            <ul className="space-y-2">
              {dayEvents.map((e) => (
                <li key={e.id} className="card-paper p-4 flex items-start gap-3">
                  <span className="text-base">📅</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-medium">{e.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                      {e.category && <span>{e.category}</span>}
                      {e.reminderOffsetMin != null && (
                        <span className="flex items-center gap-0.5"><Bell size={10} />{EVT_REMINDERS.find((o) => o.v === e.reminderOffsetMin)?.label}</span>
                      )}
                    </div>
                    {e.note && <div className="text-xs text-muted-foreground/90 mt-1">{e.note}</div>}
                  </div>
                  <button onClick={() => actions.removeEvent(e.id)} className="text-muted-foreground hover:text-foreground press p-1"><Trash2 size={13} /></button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Tasks */}
        {dayTasks.length > 0 && (
          <section>
            <h3 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-2 px-1">Tasks</h3>
            <ul className="space-y-2">
              {dayTasks.map((t) => <TaskRow key={t.id} task={t} dateKey={selected} todayKey={todayKey} />)}
            </ul>
          </section>
        )}

        {dayEvents.length === 0 && dayTasks.length === 0 && !adding && (
          <div className="card-paper p-7 text-center space-y-2">
            <div className="text-[30px]">🌤</div>
            <p className="font-display text-[19px] tracking-tight">Nothing on this day.</p>
            <p className="text-[13px] text-muted-foreground">Tap Event or Task to add something.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function AddEventForm({ date, onDone }: { date: string; onDone: () => void }) {
  const [name, setName] = useState("");
  const [cat, setCat] = useState("Health");
  const [note, setNote] = useState("");
  const [offset, setOffset] = useState<EventOffset>(1440);
  const add = () => {
    if (!name.trim()) return;
    actions.addEvent(name, date, note, cat, offset);
    onDone();
  };
  return (
    <div className="card-paper p-4 space-y-2 animate-fade-up">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">New event · {formatISTDate(date)}</div>
        <button onClick={onDone} className="text-muted-foreground press"><X size={14} /></button>
      </div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Event name"
        className="w-full rounded-full bg-muted px-4 py-2.5 text-sm outline-none placeholder:text-foreground/40" />
      <div className="flex gap-1.5 flex-wrap">
        {EVT_CATS.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`text-[11px] rounded-full px-3 py-1 press ${cat === c ? "bg-lavender text-[#1A1C1A]" : "bg-muted text-foreground/70"}`}>{c}</button>
        ))}
      </div>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)"
        className="w-full rounded-full bg-muted px-4 py-2.5 text-sm outline-none placeholder:text-foreground/40" />
      <div className="flex items-center gap-2 flex-wrap">
        <Bell size={12} className="text-muted-foreground" />
        {EVT_REMINDERS.map((o) => (
          <button key={o.v} onClick={() => setOffset(o.v)} className={`text-[10px] rounded-full px-2.5 py-1 press ${offset === o.v ? "bg-sage text-[#1A1C1A]" : "bg-muted text-foreground/60"}`}>{o.label}</button>
        ))}
      </div>
      <button onClick={add} disabled={!name.trim()} className="w-full rounded-full bg-sage-deep text-primary-foreground py-2.5 text-sm font-medium press disabled:opacity-40">Add event</button>
    </div>
  );
}

function AddTaskForm({ date, todayKey, onDone }: { date: string; todayKey: string; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [high, setHigh] = useState(false);
  const [timeStr, setTimeStr] = useState("");
  const [offset, setOffset] = useState<ReminderOffset | null>(null);

  const add = () => {
    if (!title.trim()) return;
    let remindIso: string | undefined;
    if (timeStr) {
      const [hh, mm] = timeStr.split(":").map(Number);
      const { y, m, d } = parseKey(date);
      const dt = new Date(y, m, d, hh || 0, mm || 0, 0, 0);
      remindIso = dt.toISOString();
    }
    if (date === todayKey) {
      actions.addTask("today", title.trim(), high ? "high" : "normal", false, remindIso, { reminderOffsetMin: offset ?? undefined });
    } else {
      actions.addTask("upcoming", title.trim(), high ? "high" : "normal", false, remindIso, { reminderOffsetMin: offset ?? undefined, dueDate: date });
    }
    onDone();
  };

  return (
    <div className="card-paper p-4 space-y-2 animate-fade-up">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">New task · {formatISTDate(date)}</div>
        <button onClick={onDone} className="text-muted-foreground press"><X size={14} /></button>
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} placeholder="What to do"
        className="w-full rounded-full bg-muted px-4 py-2.5 text-sm outline-none placeholder:text-foreground/40" />
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setHigh(!high)} className={`text-[11px] rounded-full px-3 py-1 press ${high ? "bg-amber text-[#1A1C1A]" : "bg-muted text-foreground/70"}`}>High priority</button>
        <input type="time" value={timeStr} onChange={(e) => setTimeStr(e.target.value)}
          className="rounded-full bg-muted px-3 py-1.5 text-xs outline-none" />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Bell size={12} className="text-muted-foreground" />
        {TASK_REMINDERS.map((o) => (
          <button key={o.v} onClick={() => setOffset(offset === o.v ? null : o.v)} className={`text-[10px] rounded-full px-2.5 py-1 press ${offset === o.v ? "bg-lavender text-[#1A1C1A]" : "bg-muted text-foreground/60"}`}>{o.label}</button>
        ))}
      </div>
      <button onClick={add} disabled={!title.trim()} className="w-full rounded-full bg-sage-deep text-primary-foreground py-2.5 text-sm font-medium press disabled:opacity-40">Add task</button>
    </div>
  );
}

function TaskRow({ task, dateKey, todayKey }: { task: TaskItem; dateKey: string; todayKey: string }) {
  const scope: "today" | "upcoming" = dateKey === todayKey && !task.dueDate ? "today" : "upcoming";
  return (
    <li className={`p-4 ${task.priority === "high" ? "card-peach" : "card-paper"}`}>
      <div className="flex items-center gap-3">
        <button
          onClick={() => actions.toggleTask(scope, task.id)}
          className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 press transition ${task.done ? "bg-sage-deep text-primary-foreground" : "bg-card/60 border border-foreground/20"}`}
        >{task.done && <Check size={13} />}</button>
        <div className="flex-1 min-w-0">
          <p className={`text-[15px] ${task.done ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5 flex-wrap">
            {task.remindAt && (
              <span className="flex items-center gap-0.5"><Bell size={10} /> {new Date(task.remindAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
            )}
            {task.priority === "high" && <span className="text-amber">🔥</span>}
          </div>
        </div>
        <button onClick={() => actions.removeTask(scope, task.id)} className="text-foreground/30 hover:text-foreground transition press">
          <Trash2 size={13} />
        </button>
      </div>
    </li>
  );
}
