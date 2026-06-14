// Build a chronological timeline by merging sleep, mood, energy, wins, habits,
// completed tasks, and calendar events. (Study + Journal removed.)

import { LIFE_START_KEY, type State, type Habit } from "./store";
import { formatHM } from "./ist";

export type TimelineKind = "mood" | "energy" | "sleep" | "habit" | "task" | "event" | "win";

export interface TimelineItem {
  id: string;
  kind: TimelineKind;
  dateKey: string;
  emoji: string;
  text: string;
  detail?: string;
}

const MOOD_LABEL: Record<string, string> = { difficult: "Difficult", okay: "Okay", good: "Good", great: "Great" };
const MOOD_EMOJI: Record<string, string> = { difficult: "😔", okay: "😐", good: "🙂", great: "😄" };
const ENERGY_EMOJI: Record<string, string> = { low: "🪶", medium: "🌤", high: "⚡" };

export function buildTimeline(s: State): Record<string, TimelineItem[]> {
  const byDate: Record<string, TimelineItem[]> = {};
  const habitById = new Map<string, Habit>();
  for (const h of s.habits) habitById.set(h.id, h);
  for (const h of s.archivedHabits ?? []) habitById.set(h.id, h);

  const push = (k: string, it: TimelineItem) => { (byDate[k] = byDate[k] ?? []).push(it); };

  for (const k of Object.keys(s.days)) {
    if (k < LIFE_START_KEY) continue;
    const d = s.days[k];
    if (d.sleep?.durationMinutes) {
      push(k, { id: `${k}-sleep`, kind: "sleep", dateKey: k, emoji: "😴", text: `Slept ${formatHM(d.sleep.durationMinutes)}`, detail: d.sleep.sleptAt && d.sleep.wokeAt ? `${d.sleep.sleptAt} → ${d.sleep.wokeAt}` : undefined });
    }
    if (d.mood) push(k, { id: `${k}-mood`, kind: "mood", dateKey: k, emoji: MOOD_EMOJI[d.mood], text: `Mood: ${MOOD_LABEL[d.mood]}` });
    if (d.energy) push(k, { id: `${k}-energy`, kind: "energy", dateKey: k, emoji: ENERGY_EMOJI[d.energy], text: `Energy: ${d.energy}` });

    for (const [hid, log] of Object.entries(d.habits)) {
      if (!log.done) continue;
      const h = habitById.get(hid);
      if (!h) continue;
      push(k, { id: `${k}-h-${hid}`, kind: "habit", dateKey: k, emoji: h.icon || "🌿", text: h.name });
    }

    for (const t of d.tasksToday) {
      if (!t.done) continue;
      push(k, { id: `${k}-t-${t.id}`, kind: "task", dateKey: k, emoji: "✅", text: t.title });
    }
    for (const t of d.tasksUpcoming ?? []) {
      if (!t.done) continue;
      const dk = t.dueDate ?? k;
      if (dk < LIFE_START_KEY) continue;
      push(dk, { id: `${dk}-tu-${t.id}`, kind: "task", dateKey: dk, emoji: "✅", text: t.title });
    }

    if (d.study.win) {
      push(k, { id: `${k}-win`, kind: "win", dateKey: k, emoji: "🏆", text: d.study.win });
    }
  }

  for (const e of s.events ?? []) {
    if (e.date < LIFE_START_KEY) continue;
    push(e.date, { id: `e-${e.id}`, kind: "event", dateKey: e.date, emoji: "📅", text: e.name, detail: e.note });
  }

  return byDate;
}
