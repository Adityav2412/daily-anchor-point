import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { actions, useStore, useToday, type HabitCategory, type Habit } from "@/lib/store";
import { currentWeekKeysIST, formatISTDate, istDateKey } from "@/lib/ist";
import { Plus, Archive, RotateCcw, Pencil, Trash2, GripVertical } from "lucide-react";

export const Route = createFileRoute("/habits")({
  head: () => ({ meta: [{ title: "Habits — LIFE" }] }),
  component: HabitsPage,
});

const EMOJI_PRESETS = ["💧", "💊", "🚶", "🧘", "😴", "🍎", "📖", "🧠", "🌿", "☀️", "💪", "🧴"];
const REASONS = ["Forgot", "Busy", "Low Energy", "Sick", "Other"] as const;

const CATEGORIES: { value: "non-negotiable" | "adapting"; label: string }[] = [
  { value: "non-negotiable", label: "Non-Negotiable" },
  { value: "adapting", label: "Trying To Adapt" },
];

function HabitsPage() {
  const habitsRaw = useStore((s) => s.habits);
  const archived = useStore((s) => s.archivedHabits ?? []);
  const habits = useMemo(
    () => [...habitsRaw].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [habitsRaw]
  );
  const [showArchived, setShowArchived] = useState(false);
  const [addOpen, setAddOpen] = useState<HabitCategory | null>(null);
  const [editing, setEditing] = useState<Habit | null>(null);

  const grouped: Record<"non-negotiable" | "adapting", Habit[]> = {
    "non-negotiable": habits.filter((h) => h.category === "non-negotiable"),
    "adapting": habits.filter((h) => h.category === "adapting"),
  };

  return (
    <AppShell title="Habits" subtitle="Swipe right — done. Swipe left — not today.">
      <div className="space-y-6 stagger">
        {editing && <HabitForm initial={editing} onClose={() => setEditing(null)} />}

        {CATEGORIES.map((cat) => (
          <CategorySection
            key={cat.value}
            cat={cat.value}
            label={cat.label}
            habits={grouped[cat.value]}
            onAdd={() => setAddOpen(cat.value)}
            onEdit={setEditing}
          />
        ))}

        {addOpen && <HabitForm category={addOpen} onClose={() => setAddOpen(null)} />}

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
                    <button onClick={() => actions.restoreHabit(h.id)} className="text-xs text-sage-deep press flex items-center gap-1">
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

function CategorySection({
  cat, label, habits, onAdd, onEdit,
}: {
  cat: "non-negotiable" | "adapting";
  label: string;
  habits: Habit[];
  onAdd: () => void;
  onEdit: (h: Habit) => void;
}) {
  // Drag & drop handlers
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const onDropSection = (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/habit-id");
    if (!id) return;
    actions.moveHabit(id, cat);
  };

  return (
    <section onDragOver={onDragOver} onDrop={onDropSection}>
      <div className="flex items-center justify-between mb-2 px-1">
        <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          {cat === "non-negotiable" ? "🌳 " : "🌱 "}{label}
        </h2>
        <button onClick={onAdd} className="rounded-full bg-sage text-[#1A1C1A] px-3 py-1.5 text-[11px] font-semibold press flex items-center gap-1">
          <Plus size={11} /> Add
        </button>
      </div>
      <div className="space-y-2.5">
        {habits.length === 0 && (
          <div className="card-paper py-7 text-center text-[13px] text-muted-foreground italic">
            {cat === "non-negotiable" ? "No essentials yet. Tap Add." : "Add a habit you're trying to build."}
          </div>
        )}
        {habits.map((h) => (
          <HabitRow key={h.id} habit={h} onEdit={() => onEdit(h)} />
        ))}
      </div>
    </section>
  );
}

function HabitRow({ habit, onEdit }: { habit: Habit; onEdit: () => void }) {
  const today = useToday();
  const days = useStore((s) => s.days);
  const log = today.habits[habit.id];
  const done = !!log?.done;
  const missed = log && !log.done;

  const weekKeys = useMemo(() => currentWeekKeysIST(), []);
  const todayKey = istDateKey();
  const WEEK_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

  const [reasonOpen, setReasonOpen] = useState(false);
  const [reasonOther, setReasonOther] = useState("");

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/habit-id", habit.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e) => { e.preventDefault(); }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = e.dataTransfer.getData("text/habit-id");
        if (!id || id === habit.id) return;
        actions.moveHabit(id, habit.category, habit.id);
      }}
      className={`p-4 transition ${done ? "card-sage" : missed ? "card-peach" : "card-paper"}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-foreground/30 cursor-grab" aria-label="Drag"><GripVertical size={14} /></span>
        <div className="text-2xl shrink-0">{habit.icon || "🌿"}</div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-medium truncate">{habit.name}</p>
          {missed && log?.reason && <p className="text-xs text-muted-foreground italic mt-0.5">"{log.reason}"</p>}
        </div>
        <Menu
          onEdit={onEdit}
          onArchive={() => actions.archiveHabit(habit.id)}
          onDelete={() => { if (confirm("Delete this habit? History is kept.")) actions.removeHabit(habit.id); }}
        />
      </div>

      <div className="mt-3">
        <SwipeToggle
          state={done ? "done" : missed ? "missed" : "idle"}
          onDone={() => actions.toggleHabit(habit.id, true)}
          onMissed={() => { setReasonOpen(true); }}
        />
      </div>

      {/* Week dots (Monday-first) */}
      <div className="flex items-center gap-2 mt-3">
        {weekKeys.map((k, i) => {
          const d = days[k]?.habits[habit.id];
          const future = k > todayKey;
          const c = future ? "bg-foreground/8" : !d ? "bg-foreground/15" : d.done ? "bg-success" : "bg-amber";
          return (
            <div key={k} className="flex flex-col items-center gap-1">
              <span className="text-[9px] text-muted-foreground/70 leading-none">{WEEK_LABELS[i]}</span>
              <span
                className={`h-2 w-2 rounded-full ${c} ${k === todayKey ? "ring-2 ring-foreground/30 ring-offset-1 ring-offset-transparent" : ""}`}
                title={formatISTDate(k)}
              />
            </div>
          );
        })}
        <span className="text-[10px] text-muted-foreground ml-auto self-end">
          {weekKeys.filter((k) => days[k]?.habits[habit.id]?.done).length}/7
        </span>
      </div>

      {reasonOpen && (
        <div className="mt-3 animate-fade-up">
          <div className="flex flex-wrap gap-1.5">
            {REASONS.map((r) => (
              <button
                key={r}
                onClick={() => {
                  if (r === "Other") return;
                  actions.toggleHabit(habit.id, false, r);
                  setReasonOpen(false);
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
              onClick={() => { actions.toggleHabit(habit.id, false, reasonOther || "Other"); setReasonOpen(false); }}
              className="rounded-full bg-foreground text-background px-3 py-2 text-xs press"
            >Save</button>
          </div>
        </div>
      )}
    </div>
  );
}

// iPhone-style swipeable toggle. Center = idle, swipe right = done, swipe left = missed.
function SwipeToggle({
  state, onDone, onMissed,
}: {
  state: "idle" | "done" | "missed";
  onDone: () => void;
  onMissed: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const THRESHOLD = 60;

  const onPointerDown = (e: React.PointerEvent) => {
    if (state !== "idle") return;
    (e.target as Element).setPointerCapture(e.pointerId);
    setDragging(true);
    startX.current = e.clientX;
    setDx(0);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const w = trackRef.current?.clientWidth ?? 280;
    const max = w / 2 - 24;
    const next = Math.max(-max, Math.min(max, e.clientX - startX.current));
    setDx(next);
  };
  const onPointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    if (dx >= THRESHOLD) { onDone(); }
    else if (dx <= -THRESHOLD) { onMissed(); }
    setDx(0);
  };

  const ratio = Math.max(-1, Math.min(1, dx / 100));
  const bg = state === "done"
    ? "bg-success/30"
    : state === "missed"
      ? "bg-amber/30"
      : ratio > 0
        ? `bg-success/20`
        : ratio < 0
          ? `bg-amber/20`
          : "bg-muted";

  const thumbColor = state === "done"
    ? "bg-success text-[#1A1C1A]"
    : state === "missed"
      ? "bg-amber text-[#1A1C1A]"
      : dx > 20
        ? "bg-success text-[#1A1C1A]"
        : dx < -20
          ? "bg-amber text-[#1A1C1A]"
          : "bg-card text-foreground/70 border border-foreground/15";

  const thumbLabel = state === "done" ? "✓"
    : state === "missed" ? "✕"
      : dx > 20 ? "✓"
        : dx < -20 ? "✕"
          : "•";

  const restingPos = state === "done" ? "calc(100% - 44px)" : state === "missed" ? "4px" : "calc(50% - 18px)";

  return (
    <div
      ref={trackRef}
      className={`relative h-10 rounded-full ${bg} transition-colors select-none overflow-hidden`}
    >
      <div className="absolute inset-0 flex items-center justify-between px-4 text-[10px] uppercase tracking-wider pointer-events-none">
        <span className={`${dx < -20 || state === "missed" ? "text-foreground/70 font-semibold" : "text-foreground/35"}`}>Missed</span>
        <span className={`text-[10px] ${state === "idle" && Math.abs(dx) < 10 ? "text-foreground/40" : "text-foreground/20"}`}>swipe</span>
        <span className={`${dx > 20 || state === "done" ? "text-foreground/70 font-semibold" : "text-foreground/35"}`}>Done</span>
      </div>
      <button
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          left: dragging ? `calc(50% - 18px + ${dx}px)` : restingPos,
          transition: dragging ? "none" : "left 0.25s ease",
        }}
        className={`absolute top-1 h-8 w-9 rounded-full ${thumbColor} flex items-center justify-center text-sm font-semibold shadow-[0_2px_8px_-2px_rgba(0,0,0,0.2)] touch-none press`}
        aria-label="Swipe to mark"
      >{thumbLabel}</button>
    </div>
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

function HabitForm({ initial, category, onClose }: { initial?: Habit; category?: HabitCategory; onClose: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "🌿");
  const [cat, setCat] = useState<"non-negotiable" | "adapting">(
    (initial?.category === "non-negotiable" ? "non-negotiable" : initial?.category === "adapting" ? "adapting" : (category === "non-negotiable" ? "non-negotiable" : "adapting"))
  );
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
