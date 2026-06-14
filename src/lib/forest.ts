// Forest grows from Non-Negotiable habit completion.
// - Today's plant reflects how many NN habits are done today.
// - The forest grid shows past days, each day a tree/sprout/soil based on that day's NN ratio.

import type { State, Habit, DayData } from "./store";
import { lastNDays } from "./ist";

export type ForestStage = 0 | 1 | 2 | 3 | 4 | 5;
// 0 = soil, 1 = seed, 2 = sprout, 3 = young plant, 4 = small tree, 5 = full tree

export const STAGE_EMOJI: Record<ForestStage, string> = {
  0: "🟫",
  1: "🌰",
  2: "🌱",
  3: "🌿",
  4: "🌳",
  5: "🌲",
};

export const STAGE_LABEL: Record<ForestStage, string> = {
  0: "Bare soil",
  1: "A small seed",
  2: "A little sprout",
  3: "Young plant",
  4: "Small tree",
  5: "Full tree",
};

export function nonNegotiableHabits(s: State): Habit[] {
  return s.habits.filter((h) => h.category === "non-negotiable");
}

export function dayNNStats(s: State, key: string): { done: number; total: number } {
  const nn = nonNegotiableHabits(s);
  const d: DayData | undefined = s.days[key];
  if (!d) return { done: 0, total: nn.length };
  const done = nn.reduce((acc, h) => acc + (d.habits[h.id]?.done ? 1 : 0), 0);
  return { done, total: nn.length };
}

export function stageFor(done: number, total: number): ForestStage {
  if (total === 0) return done > 0 ? 5 : 0;
  if (done <= 0) return 0;
  if (done >= total) return 5;
  const r = done / total;
  if (r < 0.25) return 1;
  if (r < 0.5) return 2;
  if (r < 0.75) return 3;
  return 4;
}

export function todayForestStage(s: State, key: string): ForestStage {
  const { done, total } = dayNNStats(s, key);
  return stageFor(done, total);
}

export function recentForest(s: State, n = 35): { key: string; stage: ForestStage }[] {
  const keys = lastNDays(n);
  return keys.map((k) => ({ k, stage: todayForestStage(s, k) })).map(({ k, stage }) => ({ key: k, stage }));
}

export function forestGrowthDays(s: State, n = 30): number {
  // Number of fully-completed days (stage 5) in the last N days.
  return recentForest(s, n).filter((c) => c.stage === 5).length;
}
