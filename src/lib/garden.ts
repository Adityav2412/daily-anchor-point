// Garden = forest growth tied to Non-Negotiable habit completion.

import { store, LIFE_START_KEY, type State } from "./store";
import { istDateKey, lastNDays } from "./ist";
import { todayForestStage, forestGrowthDays, nonNegotiableHabits } from "./forest";

export const MAX_STAGE = 5;
export function stageEmoji(): string { return "🌳"; }
export function stageLabel(): string { return "Your forest"; }

export function recomputeGarden() {
  const s = store.get();
  const grown = forestGrowthDays(s, 90);
  const stage = Math.min(MAX_STAGE, Math.floor(grown / 5));
  const cur = s.garden?.stage ?? 0;
  if (stage !== cur) {
    store.set((st) => { st.garden = { ...(st.garden ?? { stage: 0 }), stage, lastGrowKey: stage > cur ? istDateKey() : st.garden?.lastGrowKey }; return st; });
  } else if (!s.garden) {
    store.set((st) => { st.garden = { stage }; return st; });
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
  fullDays: number;
  sleepLogged: number; // count of days with a sleep entry — NOT a duration/score
  wins: number;
  tasksCompleted: number;
  growth: number;
  label: string;
}

export function monthlySummary(): MonthlySummary {
  const s = store.get();
  const today = new Date();
  const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const nn = nonNegotiableHabits(s);
  let fullDays = 0;
  let wins = 0;
  let tasksCompleted = 0;
  let sleepLogged = 0;
  for (const k of Object.keys(s.days)) {
    if (!k.startsWith(ym) || k < LIFE_START_KEY) continue;
    const d = s.days[k];
    if (d.sleep?.sleptAt || d.sleep?.wokeAt) sleepLogged++;
    tasksCompleted += d.tasksToday.filter((t) => t.done).length;
    tasksCompleted += (d.tasksUpcoming ?? []).filter((t) => t.done && (t.dueDate ?? k).startsWith(ym)).length;
    if (nn.length > 0) {
      const allDone = nn.every((h) => d.habits[h.id]?.done);
      if (allDone) fullDays++;
    }
  }
  for (const m of s.memoryJar ?? []) {
    if (m.dateKey.startsWith(ym) && m.dateKey >= LIFE_START_KEY) wins++;
  }
  const monthKeys = lastNDays(30).filter((k) => k.startsWith(ym) && k >= LIFE_START_KEY);
  let monthGrown = 0;
  for (const k of monthKeys) {
    if (nn.length > 0 && nn.every((h) => s.days[k]?.habits[h.id]?.done)) monthGrown++;
  }
  const growth = monthGrown;
  const label = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return { fullDays, sleepLogged, wins, tasksCompleted, growth, label };
}

