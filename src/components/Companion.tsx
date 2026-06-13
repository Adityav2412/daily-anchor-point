import { stageEmoji, stageLabel, todaysMessage } from "@/lib/garden";

export function Companion({ stage }: { stage: number }) {
  const emoji = stageEmoji(stage);
  const label = stageLabel(stage);
  const msg = todaysMessage();
  return (
    <div className="card-sage p-8 relative overflow-hidden text-center animate-breathe">
      <div className="mx-auto h-44 w-44 rounded-full bg-card/60 flex items-center justify-center text-[110px] leading-none animate-sway" aria-hidden>
        {emoji}
      </div>
      <div className="text-[11px] uppercase tracking-[0.24em] text-foreground/55 mt-6">Your garden</div>
      <p className="font-display text-[28px] leading-tight mt-2">{label}</p>
      <p className="text-[17px] text-foreground/75 mt-3 italic leading-relaxed">"{msg}"</p>
    </div>
  );
}
