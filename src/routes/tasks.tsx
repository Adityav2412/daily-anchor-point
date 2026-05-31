import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { actions, useToday, useStore, getSettings } from "@/lib/store";
import { Plus, X, Flame, Bell, BellOff } from "lucide-react";
import { istDateKey, nowIST } from "@/lib/ist";

export const Route = createFileRoute("/tasks")({
  head: () => ({ meta: [{ title: "Tasks — daily." }] }),
  component: TasksPage,
});

// build a default ISO-local datetime string for IST (one hour from now)
function defaultReminderLocal(): string {
  const d = nowIST();
  d.setMinutes(d.getMinutes() + 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatReminder(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function TasksPage() {
  const today = useToday();
  const settings = useStore(() => getSettings());
  const [scope, setScope] = useState<"today" | "tomorrow">("today");
  const [title, setTitle] = useState("");
  const [high, setHigh] = useState(false);
  const [remindAt, setRemindAt] = useState("");
  const [editingReminder, setEditingReminder] = useState<string | null>(null);
  const [perm, setPerm] = useState<NotificationPermission | "unknown">("unknown");
  const list = scope === "today" ? today.tasksToday : today.tasksTomorrow;

  useEffect(() => { if (typeof Notification !== "undefined") setPerm(Notification.permission); }, []);

  const requestPerm = async () => {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    setPerm(p);
  };

  return (
    <AppShell title="Tasks">
      <div className="space-y-4 stagger">
        <div className="flex gap-2">
          <button onClick={() => setScope("today")} className={`flex-1 rounded-full py-2.5 text-sm font-semibold press transition ${scope === "today" ? "bg-foreground text-background" : "card-paper"}`}>Today</button>
          <button onClick={() => setScope("tomorrow")} className={`flex-1 rounded-full py-2.5 text-sm font-semibold press transition ${scope === "tomorrow" ? "bg-foreground text-background" : "card-paper"}`}>Tomorrow</button>
        </div>

        {perm !== "granted" && (
          <button onClick={requestPerm} className="w-full card-sky rounded-2xl p-3 text-sm text-left flex items-center gap-2 press">
            <Bell size={14} /> Enable notifications for reminders
          </button>
        )}

        <div className="card-paper rounded-[24px] p-4 space-y-2">
          <div className="flex gap-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task" className="flex-1 rounded-full bg-muted px-4 py-2.5 text-sm outline-none placeholder:text-foreground/40" />
            <button onClick={() => setHigh(!high)} className={`rounded-full px-3 press transition ${high ? "bg-destructive text-destructive-foreground" : "bg-muted"}`} title="High priority"><Flame size={14} /></button>
            <button
              onClick={() => {
                if (!title.trim()) return;
                actions.addTask(scope, title.trim(), high ? "high" : "normal");
                if (remindAt && scope === "today") {
                  // attach to the newly added task (last one)
                  const key = istDateKey();
                  setTimeout(() => {
                    const day = (window as unknown as { __noop?: never });
                    void day;
                    const latest = (useStore as unknown);
                    void latest;
                    // simpler: use store directly
                    import("@/lib/store").then(({ store, actions }) => {
                      const t = store.get().days[key]?.tasksToday.slice(-1)[0];
                      if (t) actions.setTaskReminder("today", t.id, new Date(remindAt).toISOString());
                    });
                  }, 0);
                }
                setTitle(""); setHigh(false); setRemindAt("");
              }}
              className="rounded-full bg-foreground text-background px-4 press"
            ><Plus size={14} /></button>
          </div>
          {scope === "today" && (
            <div className="flex items-center gap-2 px-1">
              <Bell size={12} className="text-muted-foreground" />
              <input
                type="datetime-local"
                value={remindAt}
                onChange={(e) => setRemindAt(e.target.value)}
                className="flex-1 rounded-full bg-muted px-3 py-1.5 text-xs outline-none"
              />
              {remindAt && <button onClick={() => setRemindAt("")} className="text-muted-foreground"><X size={12} /></button>}
              {!remindAt && <button onClick={() => setRemindAt(defaultReminderLocal())} className="text-[10px] uppercase tracking-wider text-muted-foreground press">+1h</button>}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground italic px-1">
            {scope === "tomorrow" ? "Auto-moves to Today at 12:00 AM IST." : "1–3 real priorities is plenty."}
          </p>
        </div>

        <div className="space-y-2.5 stagger">
          {list.length === 0 && <div className="card-paper rounded-2xl py-8 text-center text-sm text-muted-foreground italic">Nothing here. That's okay.</div>}
          {list.map((t) => (
            <div key={t.id} className={`rounded-2xl ${t.priority === "high" ? "card-blush" : "card-paper"}`}>
              <button
                onClick={() => actions.toggleTask(scope, t.id)}
                className="w-full flex items-center gap-3 p-4 text-left press"
              >
                <span className={`h-6 w-6 rounded-full border-2 flex items-center justify-center text-[12px] transition ${t.done ? "bg-foreground border-foreground text-background" : "border-foreground/30"}`}>
                  {t.done && "✓"}
                </span>
                <span className={`flex-1 text-[15px] ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.title}</span>
                {t.priority === "high" && <span className="text-[10px] uppercase tracking-wider text-destructive font-bold">🔥 High</span>}
                <span onClick={(e) => { e.stopPropagation(); actions.removeTask(scope, t.id); }} className="text-foreground/30 hover:text-foreground transition"><X size={14} /></span>
              </button>
              {scope === "today" && (
                <div className="px-4 pb-3 -mt-1 flex items-center gap-2 text-[11px]">
                  {t.remindAt ? (
                    <button onClick={() => setEditingReminder(editingReminder === t.id ? null : t.id)} className="flex items-center gap-1 text-foreground/70 press">
                      <Bell size={11} /> {formatReminder(t.remindAt)}
                    </button>
                  ) : (
                    <button onClick={() => setEditingReminder(editingReminder === t.id ? null : t.id)} className="flex items-center gap-1 text-muted-foreground press">
                      <BellOff size={11} /> Add reminder
                    </button>
                  )}
                  {editingReminder === t.id && (
                    <>
                      <input
                        type="datetime-local"
                        defaultValue={t.remindAt ? t.remindAt.slice(0, 16) : defaultReminderLocal()}
                        onChange={(e) => actions.setTaskReminder("today", t.id, e.target.value ? new Date(e.target.value).toISOString() : null)}
                        className="flex-1 rounded-full bg-muted px-2 py-1 text-[11px] outline-none"
                      />
                      {t.remindAt && (
                        <button onClick={() => { actions.setTaskReminder("today", t.id, null); setEditingReminder(null); }} className="text-muted-foreground"><X size={11} /></button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="card-mint rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">End of day</div>
              <div className="text-sm mt-1">Remind me about incomplete tasks</div>
            </div>
            <button
              onClick={() => actions.setSettings({ eodReminderEnabled: !settings.eodReminderEnabled })}
              className={`relative h-6 w-11 rounded-full transition ${settings.eodReminderEnabled ? "bg-foreground" : "bg-muted"}`}
              aria-label="Toggle end of day reminder"
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition ${settings.eodReminderEnabled ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>
          {settings.eodReminderEnabled && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Remind</span>
              <input
                type="number"
                min={5}
                max={240}
                value={settings.eodMinutesBefore}
                onChange={(e) => actions.setSettings({ eodMinutesBefore: Math.max(5, Math.min(240, Number(e.target.value) || 30)) })}
                className="w-16 rounded-full bg-background/60 px-2 py-1 text-center outline-none"
              />
              <span>minutes before 11:59 PM IST</span>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
