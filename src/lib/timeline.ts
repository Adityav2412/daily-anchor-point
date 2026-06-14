// Build a chronological timeline: sleep, habits done + missed, completed tasks,
// calendar events, wins, and forest growth milestones.

import { LIFE_START_KEY, type State, type Habit } from "./store";
import { formatHM } from "./ist";
import { dayNNStats, stageFor, STAGE_EMOJI, STAGE_LABEL } from "./forest";

export type TimelineKind = "sleep" | "habit" | "missed" | "task" | "event" | "win" | "forest";

export interface TimelineItem {
  id: string;
  kind: TimelineKind;
  dateKey: string;
  emoji: string;
  text: string;
  detail?: string;
}

export function buildTimeline(s: State): Record<string, TimelineItem[]> {
  const byDate: Record<string, TimelineItem[]> = {};
  const habitById = new Map<string, Habit>();
  for (const h of s.habits) habitById.set(h.id, h);
  for (const h of s.archivedHabits ?? []) habitById.set(h.id, h);

  const push = (k: string, it: TimelineItem) => { (byDate[k] = byDate[k] ?? []).push(it); };

  for (const k of Object.keys(s.days)) {
    if (k < LIFE_START_KEY) continue;
    const d = s.days[k];

    if (d.sleep?.sleptAt) push(k, { id: `${k}-slept`, kind: "sleep", dateKey: k, emoji: "😴", text: `Slept at ${d.sleep.sleptAt}` });
    if (d.sleep?.wokeAt) push(k, { id: `${k}-woke`, kind: "sleep", dateKey: k, emoji: "☀️", text: `Woke at ${d.sleep.wokeAt}`, detail: d.sleep.durationMinutes ? formatHM(d.sleep.durationMinutes) : undefined });

    for (const [hid, log] of Object.entries(d.habits)) {
      const h = habitById.get(hid);
      if (!h) continue;
      if (log.done) {
        push(k, { id: `${k}-h-${hid}`, kind: "habit", dateKey: k, emoji: h.icon || "🌿", text: h.name });
      } else {
        push(k, { id: `${k}-m-${hid}`, kind: "missed", dateKey: k, emoji: "❌", text: `Missed: ${h.name}`, detail: log.reason });
      }
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

    if (d.study.win) push(k, { id: `${k}-win`, kind: "win", dateKey: k, emoji: "🏆", text: d.study.win });

    // Forest milestone: all NN done that day
    const { done, total } = dayNNStats(s, k);
    if (total > 0 && done === total) {
      const stage = stageFor(done, total);
      push(k, { id: `${k}-forest`, kind: "forest", dateKey: k, emoji: STAGE_EMOJI[stage], text: `Forest grew · ${STAGE_LABEL[stage]}` });
    }
  }

  for (const e of s.events ?? []) {
    if (e.date < LIFE_START_KEY) continue;
    push(e.date, { id: `e-${e.id}`, kind: "event", dateKey: e.date, emoji: "📅", text: e.name, detail: e.note });
  }

  return byDate;
}
