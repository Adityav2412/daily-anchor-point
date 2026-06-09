import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { actions, useStore } from "@/lib/store";
import { istDateKey, nowIST } from "@/lib/ist";
import { Plus, X, Calendar as CalendarIcon } from "lucide-react";
import { CalendarCheck as CalendarCheckIllo } from "@/components/illustrations";

export const Route = createFileRoute("/calendar")({
  head: () => ({ meta: [{ title: "Calendar — upcoming." }] }),
  component: CalendarPage,
});

function daysBetween(dateKey: string): number {
  const today = istDateKey();
  const [ty, tm, td] = today.split("-").map(Number);
  const [y, m, d] = dateKey.split("-").map(Number);
  const a = Date.UTC(ty, tm - 1, td);
  const b = Date.UTC(y, m - 1, d);
  return Math.round((b - a) / 86400000);
}

function relativeLabel(diff: number): string {
  if (diff < 0) return `passed · ${Math.abs(diff)}d ago`;
  if (diff === 0) return "today!";
  if (diff === 1) return "tomorrow";
  return `in ${diff} days`;
}

function colorFor(diff: number): string {
  if (diff < 0) return "bg-muted text-muted-foreground";
  if (diff <= 3) return "bg-red-500/15 text-red-600 dark:text-red-400";
  if (diff <= 7) return "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400";
  return "bg-green-500/15 text-green-700 dark:text-green-400";
}

function formatNiceDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function todayKeyForInput(): string {
  return istDateKey();
}

function CalendarPage() {
  const events = useStore((s) => s.events ?? []);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");

  const sorted = [...events]
    .map((e) => ({ ...e, diff: daysBetween(e.date) }))
    .sort((a, b) => {
      // upcoming first (diff >= 0), then passed (most recent first)
      const aPast = a.diff < 0, bPast = b.diff < 0;
      if (aPast !== bPast) return aPast ? 1 : -1;
      if (aPast) return b.diff - a.diff;
      return a.diff - b.diff;
    });

  const upcoming = sorted.filter((e) => e.diff >= 0);
  const passed = sorted.filter((e) => e.diff < 0);

  function add() {
    if (!name.trim() || !date) return;
    actions.addEvent(name, date, note);
    setName(""); setDate(""); setNote("");
  }

  return (
    <AppShell title="Calendar" subtitle="Upcoming, all in IST.">
      <div className="flex justify-center -mt-2 mb-3"><CalendarCheckIllo className="h-20 w-auto" /></div>
      <section className="rounded-3xl border bg-card p-5 mb-4 animate-pop">
        <div className="flex items-center gap-2 mb-3">
          <CalendarIcon size={16} className="text-muted-foreground" />
          <h2 className="font-display text-lg">Add event</h2>
        </div>
        <div className="space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Event name"
            className="w-full h-10 px-3 rounded-xl border bg-background text-sm"
          />
          <input
            type="date"
            value={date}
            min={todayKeyForInput()}
            onChange={(e) => setDate(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border bg-background text-sm"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="w-full h-10 px-3 rounded-xl border bg-background text-sm"
          />
          <button
            onClick={add}
            disabled={!name.trim() || !date}
            className="w-full h-10 rounded-xl bg-foreground text-background text-sm font-medium press disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </section>

      <section className="mb-4">
        <h2 className="font-display text-lg mb-2 px-1">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground px-1 py-4">Nothing on the horizon yet.</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((e) => (
              <li key={e.id} className="rounded-2xl border bg-card p-4 flex items-start gap-3 animate-fade-up">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">{e.name}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${colorFor(e.diff)}`}>
                      {relativeLabel(e.diff)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{formatNiceDate(e.date)}</div>
                  {e.note && <div className="text-xs text-muted-foreground/90 mt-1">{e.note}</div>}
                </div>
                <button
                  onClick={() => actions.removeEvent(e.id)}
                  className="text-muted-foreground hover:text-foreground press p-1"
                  aria-label="Remove"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {passed.length > 0 && (
        <section className="mb-4">
          <h2 className="font-display text-lg mb-2 px-1 text-muted-foreground">Passed</h2>
          <ul className="space-y-2">
            {passed.map((e) => (
              <li key={e.id} className="rounded-2xl border bg-card/60 p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate text-muted-foreground line-through">{e.name}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${colorFor(e.diff)}`}>
                      {relativeLabel(e.diff)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{formatNiceDate(e.date)}</div>
                  {e.note && <div className="text-xs text-muted-foreground/80 mt-1">{e.note}</div>}
                </div>
                <button
                  onClick={() => actions.removeEvent(e.id)}
                  className="text-muted-foreground hover:text-foreground press p-1"
                  aria-label="Remove"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppShell>
  );
}
