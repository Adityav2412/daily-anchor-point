import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { actions, useStore, useToday, type HabitCategory, type Habit } from "@/lib/store";
import { lastNDays, formatISTDate } from "@/lib/ist";
import { Plus, X, Check, Archive, RotateCcw, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/habits")({
  head: () => ({ meta: [{ title: "Habits — LIFE" }] }),
  component: HabitsPage,
});

const EMOJI_PRESETS = ["💧", "💊", "🚶", "🧘", "😴", "🍎", "📖", "🧠", "🌿", "☀️", "💪", "🧴"];
const REASONS = ["Forgot", "Busy", "Low Energy", "Sick", "Other"] as const;

const CATEGORIES: { value: HabitCategory; label: string }[] = [
  { value: "mental", label: "Mental" },
  { value: "physical", label: "Physical" },
  { value: "custom", label: "Custom" },
];

function normalizeCategory(c: HabitCategory): HabitCategory {
  if (c === "non-negotiable") return "mental";
  if (c === "adapting") return "physical";
  return c;
}

function HabitsPage() {
  const habits = useStore((s) => s.habits);
  const archived = useStore((s) => s.archivedHabits ?? []);
  const today = useToday();
  const days = useStore((s) => s.days);
  const last7 = useMemo(() => lastNDays(7), []);
  const [tab, setTab] = useState<HabitCategory | "all">("all");
  const [showArchived, setShowArchived] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [reasonFor, setReasonFor] = useState<string | null>(null);
  const [reasonOther, setReasonOther] = useState("");

  const list = tab === "all" ? habits : habits.filter((h) => normalizeCategory(h.category) === tab);

  return (
    <AppShell title="Habits" subtitle="One tap. No judgment.">
      <div className="space-y-4 stagger">
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1">
          <Tab active={tab === "all"} onClick={() => setTab("all")}>All</Tab>
          {CATEGORIES.map((c) => (
            <Tab key={c.value} active={tab === c.value} onClick={() => setTab(c.value)}>{c.label}</Tab>
          ))}
          <button onClick={() => setAddOpen(true)} className="ml-auto rounded-full bg-sage text-[#1A1C1A] px-3 py-2 text-xs font-semibold press flex items-center gap-1 shrink-0">
            <Plus size={12} /> Add
          </button>
        </div>

        {addOpen && <HabitForm onClose={() => setAddOpen(false)} />}
        {editing && <HabitForm initial={editing} onClose={() => setEditing(null)} />}

        <div className="space-y-2.5 stagger">
          {list.length === 0 && (
            <div className="card-paper py-8 text-center text-sm text-muted-foreground italic">
              No habits here. Tap + Add to start.
            </div>
          )}
          {list.map((h) => {
            const log = today.habits[h.id];
            const done = !!log?.done;
            const missed = log && !log.done;
            const week = last7.map((k) => ({ k, log: days[k]?.habits[h.id] }));
            return (
              <div key={h.id} className={`p-4 transition ${done ? "card-sage" : missed ? "card-peach" : "card-paper"}`}>
                <div className="flex items-center gap-3">
                  <div className="text-2xl shrink-0">{h.icon || "🌿"}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium truncate">{h.name}</p>
                    {missed && log?.reason && <p className="text-xs text-muted-foreground italic mt-0.5">"{log.reason}"</p>}
                  </div>
                  <button
                    onClick={() => actions.toggleHabit(h.id, true)}
                    aria-label="Done"
                    className={`h-9 w-9 rounded-full flex items-center justify-center press ${done ? "bg-success text-[#1A1C1A]" : "bg-card/60 border border-foreground/15"}`}
                  >{done ? <Check size={16} className="animate-tick" /> : <Check size={14} className="opacity-40" />}</button>
                  <button
                    onClick={() => { setReasonFor(reasonFor === h.id ? null : h.id); setReasonOther(""); }}
                    aria-label="Missed"
                    className={`h-9 w-9 rounded-full flex items-center justify-center press ${missed ? "bg-amber text-[#1A1C1A]" : "bg-card/60 border border-foreground/15"}`}
                  >{missed ? <X size={16} className="animate-tick" /> : <X size={14} className="opacity-40" />}</button>
                  <Menu
                    onEdit={() => setEditing(h)}
                    onArchive={() => actions.archiveHabit(h.id)}
                    onDelete={() => { if (confirm("Delete this habit? History is kept.")) actions.removeHabit(h.id); }}
                  />
                </div>

                {/* 7-day dot strip */}
                <div className="flex items-center gap-1.5 mt-3">
                  {week.map((d) => {
                    const c = !d.log ? "bg-foreground/15" : d.log.done ? "bg-success" : "bg-amber";
                    return <span key={d.k} className={`h-2 w-2 rounded-full ${c}`} title={formatISTDate(d.k)} />;
                  })}
                  <span className="text-[10px] text-muted-foreground ml-1">
                    {week.filter((d) => d.log?.done).length}/7
                  </span>
                </div>

                {reasonFor === h.id && (
                  <div className="mt-3 animate-fade-up">
                    <div className="flex flex-wrap gap-1.5">
                      {REASONS.map((r) => (
                        <button
                          key={r}
                          onClick={() => {
                            if (r === "Other") return;
                            actions.toggleHabit(h.id, false, r);
                            setReasonFor(null);
                          }}
                          className="rounded-full bg-card/70 px-3 py-1.5 text-xs press"
                        >{r}</button>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <input
                        value={reasonOther}
                        onChange={(e) => setReasonOther(e.target.value)}
                        placeholder="Other reason…"
                        className="flex-1 rounded-full bg-card/70 px-3 py-2 text-xs outline-none placeholder:text-foreground/40"
                      />
                      <button
                        onClick={() => { actions.toggleHabit(h.id, false, reasonOther || "Other"); setReasonFor(null); }}
                        className="rounded-full bg-foreground text-background px-3 py-2 text-xs press"
                      >Save</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {archived.length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 press"
            >
              <Archive size={11} /> Archived ({archived.length})
            </button>
            {showArchived && (
              <div className="mt-2 space-y-2 animate-fade-up">
                {archived.map((h) => (
                  <div key={h.id} className="card-paper p-3 flex items-center gap-3">
                    <span className="text-xl">{h.icon || "🌿"}</span>
                    <span className="flex-1 text-sm text-muted-foreground">{h.name}</span>
                    <button onClick={() => actions.restoreHabit(h.id)} className="text-xs text-sage press flex items-center gap-1">
                      <RotateCcw size={11} /> Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Tab({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-xs font-semibold transition press shrink-0 ${active ? "bg-sage text-[#1A1C1A]" : "card-paper text-foreground"}`}
    >{children}</button>
  );
}

function Menu({ onEdit, onArchive, onDelete }: { onEdit: () => void; onArchive: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="text-foreground/40 hover:text-foreground transition press p-1" aria-label="Menu">⋮</button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-7 z-40 card-paper py-1 min-w-[140px] animate-fade-up text-sm">
            <button onClick={() => { onEdit(); setOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2"><Pencil size={12} /> Edit</button>
            <button onClick={() => { onArchive(); setOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2"><Archive size={12} /> Archive</button>
            <button onClick={() => { onDelete(); setOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-muted text-destructive flex items-center gap-2"><Trash2 size={12} /> Delete</button>
          </div>
        </>
      )}
    </div>
  );
}

function HabitForm({ initial, onClose }: { initial?: Habit; onClose: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "🌿");
  const [cat, setCat] = useState<HabitCategory>(normalizeCategory(initial?.category ?? "physical"));
  const save = () => {
    const n = name.trim();
    if (!n) return;
    if (initial) actions.updateHabit(initial.id, { name: n, icon, category: cat });
    else actions.addHabit(n, cat, icon);
    onClose();
  };
  return (
    <div className="card-paper p-4 animate-fade-up">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Habit name"
        className="w-full rounded-full bg-muted px-4 py-2.5 text-sm outline-none placeholder:text-foreground/40"
      />
      <div className="flex flex-wrap gap-1.5 mt-3">
        {EMOJI_PRESETS.map((e) => (
          <button key={e} onClick={() => setIcon(e)} className={`h-9 w-9 rounded-full text-lg press ${icon === e ? "bg-sage" : "bg-muted"}`}>{e}</button>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setCat(c.value)}
            className={`flex-1 rounded-full py-2 text-xs font-medium press ${cat === c.value ? "bg-lavender text-[#1A1C1A]" : "bg-muted text-foreground/70"}`}
          >{c.label}</button>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={save} className="flex-1 rounded-full bg-sage-deep text-primary-foreground py-2.5 text-sm font-medium press">{initial ? "Save" : "Add habit"}</button>
        <button onClick={onClose} className="rounded-full bg-muted text-foreground/70 px-4 text-sm press">Cancel</button>
      </div>
    </div>
  );
}
