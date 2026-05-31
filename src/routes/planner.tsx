import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { actions, useToday, type TimeBlock } from "@/lib/store";
import { nowIST } from "@/lib/ist";
import { Plus, X, Bell } from "lucide-react";

export const Route = createFileRoute("/planner")({
  head: () => ({ meta: [{ title: "Plan — daily." }] }),
  component: PlannerPage,
});

const KIND_CLASS: Record<TimeBlock["kind"], string> = {
  study: "card-lavender", work: "card-sky", habits: "card-mint", rest: "card-peach", free: "card-paper",
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

  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const interval = setInterval(() => {
      const now = nowIST();
      const cur = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
      today.blocks.forEach((b) => {
        if (b.start === cur && !b.notified) {
          new Notification(`${b.label}`, { body: `${b.start} – ${b.end}` });
          actions.updateBlock(b.id, { notified: true });
        }
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [today.blocks]);

  const plannedMin = today.blocks.reduce((a, b) => a + diffMin(b.start, b.end), 0);
  const actualMin = today.blocks.reduce((a, b) => a + (b.actualMinutes ?? 0), 0);

  return (
    <AppShell title="Plan">
      <div className="space-y-4 stagger">
        <div className="card-paper rounded-[24px] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Available hours</div>
            {perm !== "granted" && typeof Notification !== "undefined" && (
              <button
                onClick={async () => { const p = await Notification.requestPermission(); setPerm(p); }}
                className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition"
              ><Bell size={11} /> Alerts</button>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <input
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              onBlur={() => actions.setAvailableHours(parseFloat(hours) || 0)}
              type="number"
              placeholder="6"
              className="font-display text-5xl bg-transparent w-24 outline-none"
            />
            <span className="text-muted-foreground">hours</span>
          </div>
        </div>

        <div className="card-paper rounded-[24px] p-4">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3 px-1">Add block</div>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" className="w-full rounded-full bg-muted px-4 py-2.5 text-sm outline-none mb-2 placeholder:text-foreground/40" />
          <div className="grid grid-cols-3 gap-2 mb-2">
            <select value={kind} onChange={(e) => setKind(e.target.value as TimeBlock["kind"])} className="rounded-full bg-muted px-3 py-2 text-xs outline-none">
              <option value="study">Study</option><option value="work">Work</option><option value="habits">Habits</option><option value="rest">Rest</option><option value="free">Free</option>
            </select>
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="rounded-full bg-muted px-3 py-2 text-xs outline-none" />
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="rounded-full bg-muted px-3 py-2 text-xs outline-none" />
          </div>
          <button
            onClick={() => { if (label.trim()) { actions.addBlock({ label: label.trim(), kind, start, end }); setLabel(""); } }}
            className="w-full rounded-full bg-foreground text-background py-2.5 text-sm font-semibold flex items-center justify-center gap-1 press"
          ><Plus size={14} /> Add block</button>
        </div>

        <div className="space-y-2.5 stagger">
          {today.blocks.length === 0 && <div className="card-paper rounded-2xl py-8 text-center text-sm text-muted-foreground italic">No blocks yet.</div>}
          {today.blocks.slice().sort((a,b) => a.start.localeCompare(b.start)).map((b) => (
            <div key={b.id} className={`rounded-2xl p-4 flex items-center gap-3 ${KIND_CLASS[b.kind]}`}>
              <span className="font-display text-sm tabular-nums w-24">{b.start}–{b.end}</span>
              <span className="flex-1 text-[15px] font-medium">{b.label}</span>
              <input
                type="number" placeholder="actual"
                value={b.actualMinutes ?? ""} onChange={(e) => actions.updateBlock(b.id, { actualMinutes: parseInt(e.target.value) || undefined })}
                className="w-16 rounded-full bg-background/70 px-2 py-1 text-xs text-center outline-none placeholder:text-foreground/40"
              />
              <button onClick={() => actions.removeBlock(b.id)} className="text-foreground/40 hover:text-foreground transition"><X size={14} /></button>
            </div>
          ))}
        </div>

        {today.blocks.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="card-paper rounded-[24px] p-5">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Planned</div>
              <div className="mt-2 font-display text-4xl">{Math.floor(plannedMin/60)}<span className="text-muted-foreground text-xl">h {plannedMin%60}m</span></div>
            </div>
            <div className="card-mint rounded-[24px] p-5">
              <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/60">Actual</div>
              <div className="mt-2 font-display text-4xl">{Math.floor(actualMin/60)}<span className="text-muted-foreground text-xl">h {actualMin%60}m</span></div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function diffMin(a: string, b: string) {
  const [ah, am] = a.split(":").map(Number); const [bh, bm] = b.split(":").map(Number);
  return Math.max(0, (bh*60+bm) - (ah*60+am));
}
