import { stageEmoji, stageLabel, todaysMessage } from "@/lib/garden";

export function Companion({ stage }: { stage: number }) {
  const emoji = stageEmoji(stage);
  const label = stageLabel(stage);
  const msg = todaysMessage();
  return (
    <div className="card-sage p-5 relative overflow-hidden">
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 rounded-full bg-card/70 flex items-center justify-center text-5xl animate-sway shrink-0" aria-hidden>
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/55">Your garden</div>
          <p className="font-display text-[22px] leading-tight mt-1">{label}</p>
          <p className="text-[13px] text-foreground/70 mt-1.5 italic">"{msg}"</p>
        </div>
      </div>
    </div>
  );
}
