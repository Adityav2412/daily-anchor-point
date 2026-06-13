import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { actions, useStore, type EventOffset } from "@/lib/store";
import { istDateKey } from "@/lib/ist";
import { Plus, Trash2, Calendar as CalendarIcon, Bell } from "lucide-react";

export const Route = createFileRoute("/calendar")({
  head: () => ({ meta: [{ title: "Calendar — LIFE" }] }),
  component: CalendarPage,
});

const CATEGORIES = ["Health", "Birthday", "Exam", "Travel", "Deadline", "Bill", "Family", "Other"];
const REMINDERS: { v: EventOffset; label: string }[] = [
  { v: 0, label: "Day of" },
  { v: 1440, label: "1d before" },
  { v: 4320, label: "3d before" },
  { v: 10080, label: "1w before" },
];

function daysBetween(dateKey: string): number {
  const today = istDateKey();
  const [ty, tm, td] = today.split("-").map(Number);
  const [y, m, d] = dateKey.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86400000);
}
function relativeLabel(diff: number): string {
  if (diff < 0) return `${Math.abs(diff)}d ago`;
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  return `in ${diff} days`;
}
function tone(diff: number): string {
  if (diff < 0) return "bg-muted text-muted-foreground";
  if (diff <= 3) return "bg-amber/20 text-foreground";
  if (diff <= 7) return "bg-lavender/40 text-foreground";
  return "bg-sage/30 text-foreground";
}
function formatNiceDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function CalendarPage() {
  const events = useStore((s) => s.events ?? []);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("Health");
  const [note, setNote] = useState("");
  const [offset, setOffset] = useState<EventOffset>(1440);
  const [open, setOpen] = useState(false);

  const sorted = [...events].map((e) => ({ ...e, diff: daysBetween(e.date) })).sort((a, b) => {
    const aPast = a.diff < 0, bPast = b.diff < 0;
    if (aPast !== bPast) return aPast ? 1 : -1;
    if (aPast) return b.diff - a.diff;
    return a.diff - b.diff;
  });
  const upcoming = sorted.filter((e) => e.diff >= 0);
  const passed = sorted.filter((e) => e.diff < 0);

  const add = () => {
    if (!name.trim() || !date) return;
    actions.addEvent(name, date, note, category, offset);
    setName(""); setDate(""); setNote(""); setOpen(false);
  };

  return (
    <AppShell title="Calendar" subtitle="Important life moments.">
      <div className="space-y-4 stagger">
        {!open ? (
          <button onClick={() => setOpen(true)} className="w-full card-sage p-4 flex items-center justify-center gap-2 text-sm font-medium press">
            <Plus size={14} /> Add event
          </button>
        ) : (
          <div className="card-paper p-4 space-y-2 animate-fade-up">
            <div className="flex items-center gap-2">
              <CalendarIcon size={14} className="text-sage" />
              <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">New event</span>
            </div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Event name"
              className="w-full rounded-full bg-muted px-4 py-2.5 text-sm outline-none placeholder:text-foreground/40" />
            <input type="date" value={date} min={istDateKey()} onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-full bg-muted px-4 py-2.5 text-sm outline-none" />
            <div className="flex gap-1.5 flex-wrap">
              {CATEGORIES.map((c) => (
                <button key={c} onClick={() => setCategory(c)}
                  className={`text-[11px] rounded-full px-3 py-1 press ${category === c ? "bg-lavender text-[#1A1C1A]" : "bg-muted text-foreground/70"}`}>{c}</button>
              ))}
            </div>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)"
              className="w-full rounded-full bg-muted px-4 py-2.5 text-sm outline-none placeholder:text-foreground/40" />
            <div className="flex items-center gap-2 flex-wrap">
              <Bell size={12} className="text-muted-foreground" />
              {REMINDERS.map((o) => (
                <button key={o.v} onClick={() => setOffset(o.v)}
                  className={`text-[10px] rounded-full px-2.5 py-1 press ${offset === o.v ? "bg-sage text-[#1A1C1A]" : "bg-muted text-foreground/60"}`}>{o.label}</button>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={add} disabled={!name.trim() || !date}
                className="flex-1 rounded-full bg-sage-deep text-primary-foreground py-2.5 text-sm font-medium press disabled:opacity-40">Add event</button>
              <button onClick={() => setOpen(false)} className="rounded-full bg-muted text-foreground/70 px-4 text-sm press">Cancel</button>
            </div>
          </div>
        )}

        <section>
          <h2 className="font-display text-lg mb-2 px-1">Upcoming</h2>
          {upcoming.length === 0 ? (
            <div className="card-paper p-7 text-center space-y-2">
              <div className="text-[30px]">🍃</div>
              <p className="font-display text-[19px] tracking-tight">No upcoming events.</p>
              <p className="text-[13px] text-muted-foreground">Enjoy the breathing room.</p>
            </div>
          ) : (
            <ul className="space-y-2 stagger">
              {upcoming.map((e) => (
                <li key={e.id} className="card-paper p-4 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{e.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${tone(e.diff)}`}>{relativeLabel(e.diff)}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">{formatNiceDate(e.date)}{e.category ? ` · ${e.category}` : ""}</div>
                    {e.note && <div className="text-xs text-muted-foreground/90 mt-1">{e.note}</div>}
                  </div>
                  <button onClick={() => actions.removeEvent(e.id)} className="text-muted-foreground hover:text-foreground press p-1" aria-label="Remove">
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {passed.length > 0 && (
          <section>
            <h2 className="font-display text-base mb-2 px-1 text-muted-foreground">Passed</h2>
            <ul className="space-y-2">
              {passed.map((e) => (
                <li key={e.id} className="card-paper p-3 opacity-70 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-muted-foreground">{e.name}</span>
                    <div className="text-[11px] text-muted-foreground/80 mt-0.5">{formatNiceDate(e.date)}</div>
                  </div>
                  <button onClick={() => actions.removeEvent(e.id)} className="text-muted-foreground/70 hover:text-foreground press p-1">
                    <Trash2 size={12} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </AppShell>
  );
}
