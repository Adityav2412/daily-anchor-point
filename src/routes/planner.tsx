import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { actions, useToday, type TimeBlock } from "@/lib/store";
import { nowIST } from "@/lib/ist";
import { Plus, X, Bell } from "lucide-react";

export const Route = createFileRoute("/planner")({
  head: () => ({ meta: [{ title: "Time Planner — FocusFlow" }] }),
  component: PlannerPage,
});

const KIND_COLORS: Record<TimeBlock["kind"], string> = {
  study: "var(--lilac)", work: "var(--sky)", habits: "var(--mint)", rest: "var(--peach)", free: "white",
};

function PlannerPage() {
  const today = useToday();
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<TimeBlock["kind"]>("study");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [hours, setHours] = useState<string>(today.availableHours?.toString() ?? "");
  const [perm, setPerm] = useState<NotificationPermission | "unknown">("unknown");

  useEffect(() => { if (typeof Notification !== "undefined") setPerm(Notification.permission); }, []);

  // notification scheduler
  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const interval = setInterval(() => {
      const now = nowIST();
      const cur = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
      today.blocks.forEach((b) => {
        if (b.start === cur && !b.notified) {
          new Notification(`Time block: ${b.label}`, { body: `${b.start} – ${b.end}` });
          actions.updateBlock(b.id, { notified: true });
        }
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [today.blocks]);

  const plannedMin = today.blocks.reduce((a, b) => a + diffMin(b.start, b.end), 0);
  const actualMin = today.blocks.reduce((a, b) => a + (b.actualMinutes ?? 0), 0);

  return (
    <AppShell title="Time Planner" subtitle="Gentle structure for the day.">
      <div className="card-soft border p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold">Available hours today</p>
          {perm !== "granted" && typeof Notification !== "undefined" && (
            <button
              onClick={async () => { const p = await Notification.requestPermission(); setPerm(p); }}
              className="flex items-center gap-1 text-xs underline text-foreground/60"
            ><Bell size={12} /> Enable alerts</button>
          )}
        </div>
        <div className="flex gap-2">
          <input value={hours} onChange={(e) => setHours(e.target.value)} onBlur={() => actions.setAvailableHours(parseFloat(hours) || 0)} type="number" placeholder="e.g. 6" className="flex-1 rounded-full bg-secondary px-3 py-2 text-sm outline-none" />
        </div>
      </div>

      <div className="card-soft border p-4 mb-4">
        <p className="text-xs font-semibold mb-3">Add time block</p>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" className="w-full rounded-full bg-secondary px-3 py-2 text-sm outline-none mb-2" />
        <div className="grid grid-cols-3 gap-2 mb-2">
          <select value={kind} onChange={(e) => setKind(e.target.value as TimeBlock["kind"])} className="rounded-full bg-secondary px-2 py-2 text-xs">
            <option value="study">Study</option><option value="work">Work</option><option value="habits">Habits</option><option value="rest">Rest</option><option value="free">Free</option>
          </select>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="rounded-full bg-secondary px-2 py-2 text-xs" />
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="rounded-full bg-secondary px-2 py-2 text-xs" />
        </div>
        <button
          onClick={() => { if (label.trim()) { actions.addBlock({ label: label.trim(), kind, start, end }); setLabel(""); } }}
          className="w-full rounded-full bg-primary py-2 text-sm text-primary-foreground flex items-center justify-center gap-1"
        ><Plus size={14} /> Add</button>
      </div>

      <ul className="space-y-2 mb-4">
        {today.blocks.sort((a,b) => a.start.localeCompare(b.start)).map((b) => (
          <li key={b.id} className="card-soft p-3 flex items-center gap-3" style={{ background: KIND_COLORS[b.kind] }}>
            <span className="text-xs font-mono tabular-nums w-24">{b.start}–{b.end}</span>
            <span className="flex-1 text-sm font-medium">{b.label}</span>
            <input
              type="number" placeholder="actual m"
              value={b.actualMinutes ?? ""} onChange={(e) => actions.updateBlock(b.id, { actualMinutes: parseInt(e.target.value) || undefined })}
              className="w-16 rounded-full bg-white/80 px-2 py-1 text-xs text-center outline-none"
            />
            <button onClick={() => actions.removeBlock(b.id)} className="text-foreground/50"><X size={14} /></button>
          </li>
        ))}
      </ul>

      {today.blocks.length > 0 && (
        <div className="card-soft border p-4 grid grid-cols-2 gap-4">
          <div><p className="text-[10px] uppercase tracking-wider text-foreground/60">Planned</p><p className="text-lg font-bold">{Math.floor(plannedMin/60)}h {plannedMin%60}m</p></div>
          <div><p className="text-[10px] uppercase tracking-wider text-foreground/60">Actual</p><p className="text-lg font-bold">{Math.floor(actualMin/60)}h {actualMin%60}m</p></div>
        </div>
      )}
    </AppShell>
  );
}

function diffMin(a: string, b: string) {
  const [ah, am] = a.split(":").map(Number); const [bh, bm] = b.split(":").map(Number);
  return Math.max(0, (bh*60+bm) - (ah*60+am));
}
