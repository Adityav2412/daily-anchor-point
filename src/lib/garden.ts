// Garden growth + daily companion message + monthly summary.
// Stage never decreases. Growth pauses on missing days; nothing is lost.

import { store, LIFE_START_KEY, type State } from "./store";
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
  if (d.sleep?.durationMinutes) return true;
  if (Object.values(d.habits).some((h) => h.done)) return true;
  if (d.tasksToday.some((t) => t.done)) return true;
  if (d.study.win) return true;
  return false;
}

export function recomputeGarden() {
  const s = store.get();
  let logged = 0;
  for (const k of Object.keys(s.days)) {
    if (k < LIFE_START_KEY) continue;
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
  "Small progress still counts.",
  "You don't need a perfect day.",
  "Be kind to yourself today.",
  "Slow progress is still progress.",
  "Today is enough.",
  "Glad you're here.",
  "Showing up is the win.",
] as const;

export function todaysMessage(): string {
  const s = store.get();
  const key = istDateKey();
  if (s.garden?.lastMsgKey === key && typeof s.garden.lastMsgIdx === "number") {
    return MESSAGES[s.garden.lastMsgIdx % MESSAGES.length];
  }
  const seed = key.replace(/-/g, "").split("").reduce((a, c) => a + (parseInt(c, 10) || 0), 0);
  const idx = seed % MESSAGES.length;
  store.set((st) => { st.garden = { ...(st.garden ?? { stage: 0 }), lastMsgKey: key, lastMsgIdx: idx }; return st; });
  return MESSAGES[idx];
}

export interface MonthlySummary {
  goodDays: number;
  avgSleepMinutes: number;
  wins: number;
  tasksCompleted: number;
  growth: number;
  label: string;
}

export function monthlySummary(): MonthlySummary {
  const s = store.get();
  const today = new Date();
  const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  let goodDays = 0;
  let wins = 0;
  let tasksCompleted = 0;
  let sleepSum = 0;
  let sleepDays = 0;
  for (const k of Object.keys(s.days)) {
    if (!k.startsWith(ym) || k < LIFE_START_KEY) continue;
    const d = s.days[k];
    if (d.mood === "good" || d.mood === "great") goodDays++;
    if (d.sleep?.durationMinutes) { sleepSum += d.sleep.durationMinutes; sleepDays++; }
    tasksCompleted += d.tasksToday.filter((t) => t.done).length;
    tasksCompleted += (d.tasksUpcoming ?? []).filter((t) => t.done && (t.dueDate ?? k).startsWith(ym)).length;
  }
  for (const m of s.memoryJar ?? []) {
    if (m.dateKey.startsWith(ym) && m.dateKey >= LIFE_START_KEY) wins++;
  }
  const monthKeys = lastNDays(30).filter((k) => k.startsWith(ym) && k >= LIFE_START_KEY);
  let monthLogged = 0;
  for (const k of monthKeys) if (dayHasActivity(s, k)) monthLogged++;
  const growth = Math.floor(monthLogged / 5);
  const label = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const avgSleepMinutes = sleepDays ? Math.round(sleepSum / sleepDays) : 0;
  return { goodDays, avgSleepMinutes, wins, tasksCompleted, growth, label };
}
