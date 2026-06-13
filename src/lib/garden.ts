// Garden growth + daily companion message.
// Stage never decreases. Growth pauses on missing days; nothing is lost.

import { store, studyMinutesFor, type State } from "./store";
import { istDateKey, lastNDays } from "./ist";

const STAGES = ["🌱", "🌿", "🌵", "🍀", "🌸", "🌺", "🌻", "🌳"] as const;
export const MAX_STAGE = STAGES.length - 1;

export function stageEmoji(stage: number): string {
  return STAGES[Math.max(0, Math.min(MAX_STAGE, stage))];
}

export function stageLabel(stage: number): string {
  if (stage <= 0) return "Tiny sprout";
  if (stage <= 1) return "Growing leaves";
  if (stage <= 3) return "Spreading roots";
  if (stage <= 5) return "First blooms";
  return "Little garden";
}

function dayHasActivity(s: State, key: string): boolean {
  const d = s.days[key];
  if (!d) return false;
  if (d.mood || d.energy || d.focus) return true;
  if (Object.values(d.habits).some((h) => h.done)) return true;
  if (studyMinutesFor(d) > 0) return true;
  if (d.tasksToday.some((t) => t.done)) return true;
  if (d.study.win) return true;
  const j = d.journal;
  if (j && (j.feeling || j.wentWell || j.difficult || j.tomorrow)) return true;
  return false;
}

export function recomputeGarden() {
  const s = store.get();
  let logged = 0;
  for (const k of Object.keys(s.days)) {
    if (dayHasActivity(s, k)) logged++;
  }
  const newStage = Math.min(MAX_STAGE, Math.floor(logged / 5));
  const cur = s.garden?.stage ?? 0;
  if (newStage > cur) {
    store.set((st) => { st.garden = { ...(st.garden ?? { stage: 0 }), stage: newStage, lastGrowKey: istDateKey() }; return st; });
  } else if (!s.garden) {
    store.set((st) => { st.garden = { stage: newStage }; return st; });
  }
}

const MESSAGES = [
  "Nice to see you today.",
  "One step at a time.",
  "Thanks for checking in.",
  "Rough day? Keep it simple.",
  "Small progress still counts.",
  "Glad you're here.",
  "Take it gently.",
  "Showing up is the win.",
] as const;

export function todaysMessage(): string {
  const s = store.get();
  const key = istDateKey();
  if (s.garden?.lastMsgKey === key && typeof s.garden.lastMsgIdx === "number") {
    return MESSAGES[s.garden.lastMsgIdx % MESSAGES.length];
  }
  // deterministic per dateKey
  const seed = key.replace(/-/g, "").split("").reduce((a, c) => a + (parseInt(c, 10) || 0), 0);
  const idx = seed % MESSAGES.length;
  store.set((st) => { st.garden = { ...(st.garden ?? { stage: 0 }), lastMsgKey: key, lastMsgIdx: idx }; return st; });
  return MESSAGES[idx];
}

export function monthlySummary(): { goodDays: number; studyHours: number; wins: number; growth: number; label: string } {
  const s = store.get();
  const today = new Date();
  const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  let goodDays = 0;
  let studyMin = 0;
  let wins = 0;
  for (const k of Object.keys(s.days)) {
    if (!k.startsWith(ym)) continue;
    const d = s.days[k];
    if (d.mood === "good" || d.mood === "great") goodDays++;
    studyMin += studyMinutesFor(d);
  }
  for (const m of s.memoryJar ?? []) {
    if (m.dateKey.startsWith(ym)) wins++;
  }
  // Growth = stages gained this month (approx: compare stage now to 30 days ago using activity proxy)
  const monthKeys = lastNDays(30).filter((k) => k.startsWith(ym));
  let monthLogged = 0;
  for (const k of monthKeys) if (dayHasActivity(s, k)) monthLogged++;
  const growth = Math.floor(monthLogged / 5);
  const label = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return { goodDays, studyHours: +(studyMin / 60).toFixed(1), wins, growth, label };
}
