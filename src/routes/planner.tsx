import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { actions, useToday, type TimeBlock } from "@/lib/store";
import { nowIST } from "@/lib/ist";
import { Plus, X, Bell, Check } from "lucide-react";

export const Route = createFileRoute("/planner")({
  head: () => ({ meta: [{ title: "Plan — daily." }] }),
  component: PlannerPage,
});

function PlannerPage() {
  const today = useToday();
  const [label, setLabel] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [hours, setHours] = useState<string>(today.availableHours?.toString() ?? "");
  const [perm, setPerm] = useState<NotificationPermission | "unknown">("unknown");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); if (typeof Notification !== "undefined") setPerm(Notification.permission); }, []);

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

  const doneCount = today.blocks.filter((b) => b.done).length;
  const totalCount = today.blocks.length;

  return (
    <AppShell title="Plan">
      <div className="space-y-4 stagger">
        <div className="card-paper rounded-[24px] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Available hours</div>
            {mounted && perm !== "granted" && typeof Notification !== "undefined" && (
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
              onBlur={() => actions.setAvailableHours(Math.max(0, parseFloat(hours) || 0))}
              type="number"
              min={0}
              placeholder="6"
              className="font-display text-5xl bg-transparent w-24 outline-none"
            />
            <span className="text-muted-foreground">hours</span>
          </div>
        </div>

        <div className="card-paper rounded-[24px] p-4">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3 px-1">Add block</div>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Block name (e.g. Morning Study, Evening Walk)"
            className="w-full rounded-full bg-muted px-4 py-2.5 text-sm outline-none mb-2 placeholder:text-foreground/40"
          />
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="rounded-full bg-muted px-3 py-2 text-xs outline-none" />
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="rounded-full bg-muted px-3 py-2 text-xs outline-none" />
          </div>
          <button
            onClick={() => {
              if (label.trim()) {
                actions.addBlock({ label: label.trim(), kind: "free" as TimeBlock["kind"], start, end });
                setLabel("");
              }
            }}
            className="w-full rounded-full bg-foreground text-background py-2.5 text-sm font-semibold flex items-center justify-center gap-1 press"
          ><Plus size={14} /> Add block</button>
        </div>

        <div className="space-y-2.5 stagger">
          {today.blocks.length === 0 && <div className="card-paper rounded-2xl py-8 text-center text-sm text-muted-foreground italic">No blocks yet.</div>}
          {today.blocks.slice().sort((a,b) => a.start.localeCompare(b.start)).map((b) => (
            <div key={b.id} className="card-paper rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <span className="font-display text-sm tabular-nums w-24">{b.start}–{b.end}</span>
                <span className={`flex-1 text-[15px] font-medium ${b.done ? "line-through opacity-50" : ""}`}>{b.label}</span>
                <button onClick={() => actions.removeBlock(b.id)} className="text-foreground/40 hover:text-foreground transition"><X size={14} /></button>
              </div>
              <div className="flex items-center gap-2 pl-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${b.done ? "bg-foreground border-foreground" : "border-muted-foreground/40"}`}>
                    {b.done && <Check size={12} className="text-background" />}
                  </div>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={b.done || false}
                    onChange={(e) => actions.updateBlock(b.id, { done: e.target.checked })}
                  />
                  <span className="text-xs text-muted-foreground">{b.done ? "Done" : "Not done"}</span>
                </label>
              </div>
              {b.done === false && (
                <input
                  value={b.reason || ""}
                  onChange={(e) => actions.updateBlock(b.id, { reason: e.target.value })}
                  placeholder="Why not done?"
                  className="w-full rounded-full bg-muted px-3 py-2 text-xs outline-none placeholder:text-foreground/40"
                />
              )}
            </div>
          ))}
        </div>

        {totalCount > 0 && (
          <div className="card-paper rounded-[24px] p-5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">End of day</div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl">{doneCount}</span>
              <span className="text-muted-foreground text-sm">of</span>
              <span className="font-display text-3xl">{totalCount}</span>
              <span className="text-muted-foreground text-sm">blocks completed</span>
              <span className={`ml-auto text-sm font-medium ${doneCount === totalCount ? "text-foreground" : "text-muted-foreground"}`}>
                {totalCount === 0 ? "—" : `${Math.round((doneCount / totalCount) * 100)}%`}
              </span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-foreground transition-all duration-500"
                style={{ width: `${totalCount === 0 ? 0 : (doneCount / totalCount) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
