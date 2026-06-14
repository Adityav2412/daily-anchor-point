import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { istDateKey, formatISTDate } from "@/lib/ist";
import { STAGE_EMOJI, STAGE_LABEL, dayNNStats, stageFor, recentForest, nonNegotiableHabits } from "@/lib/forest";

export function Forest() {
  const s = useStore((st) => st);
  const todayKey = istDateKey();
  const nn = nonNegotiableHabits(s);
  const { done, total } = dayNNStats(s, todayKey);
  const stage = stageFor(done, total);
  const grid = useMemo(() => recentForest(s, 35), [s]);
  const grown = grid.filter((c) => c.stage === 5).length;

  return (
    <div className="card-sage p-7 overflow-hidden">
      <div className="text-[11px] uppercase tracking-[0.24em] text-foreground/55">Your forest</div>

      {/* Today's plant */}
      <div className="mt-4 rounded-3xl bg-card/55 p-6 text-center animate-breathe">
        <div className="text-[100px] leading-none select-none" aria-hidden>
          {STAGE_EMOJI[stage]}
        </div>
        <p className="font-display text-[24px] tracking-tight mt-3">{STAGE_LABEL[stage]}</p>
        {total > 0 ? (
          <p className="text-[13px] text-foreground/65 mt-1">
            {done} of {total} non-negotiables today
          </p>
        ) : (
          <p className="text-[13px] text-foreground/65 mt-1">
            Add a non-negotiable habit to plant the first seed.
          </p>
        )}
      </div>

      {/* Forest grid */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/55">Last 5 weeks</div>
          <div className="text-[10px] text-foreground/55">{grown} full {grown === 1 ? "tree" : "trees"}</div>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {grid.map((c) => (
            <div
              key={c.key}
              title={`${formatISTDate(c.key)} — ${STAGE_LABEL[c.stage]}`}
              className={`aspect-square rounded-lg flex items-center justify-center text-[15px] ${
                c.stage === 0 ? "bg-card/30" : "bg-card/70"
              } ${c.key === todayKey ? "ring-2 ring-foreground/30" : ""}`}
            >
              <span aria-hidden>{STAGE_EMOJI[c.stage]}</span>
            </div>
          ))}
        </div>
        {nn.length === 0 && (
          <p className="text-[11px] text-foreground/50 italic mt-3 text-center">
            The forest grows as you complete your non-negotiable habits.
          </p>
        )}
      </div>
    </div>
  );
}
