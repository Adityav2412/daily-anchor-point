// Build a chronological timeline by merging mood, energy, wins, habits, study,
// completed tasks, journal entries, and calendar events.

import { store, studyMinutesFor, LIFE_START_KEY, type State, type Habit } from "./store";
import { formatHM } from "./ist";

export type TimelineKind = "mood" | "energy" | "habit" | "study" | "task" | "journal" | "event" | "win";

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
    const d = s.days[k];
    if (d.mood) push(k, { id: `${k}-mood`, kind: "mood", dateKey: k, emoji: MOOD_EMOJI[d.mood], text: `Mood: ${MOOD_LABEL[d.mood]}` });
    if (d.energy) push(k, { id: `${k}-energy`, kind: "energy", dateKey: k, emoji: ENERGY_EMOJI[d.energy], text: `Energy: ${d.energy}` });

    for (const [hid, log] of Object.entries(d.habits)) {
      if (!log.done) continue;
      const h = habitById.get(hid);
      if (!h) continue;
      push(k, { id: `${k}-h-${hid}`, kind: "habit", dateKey: k, emoji: h.icon || "🌿", text: h.name });
    }

    const sess = d.study.sessions ?? [];
    if (sess.length) {
      const total = sess.reduce((a, x) => a + x.durationMin, 0);
      const subjects = Array.from(new Set(sess.map((x) => x.subject))).join(", ");
      push(k, { id: `${k}-study`, kind: "study", dateKey: k, emoji: "📚", text: `Studied ${formatHM(total)}`, detail: subjects });
    } else if (studyMinutesFor(d) > 0) {
      push(k, { id: `${k}-study-e`, kind: "study", dateKey: k, emoji: "📚", text: `Studied ${formatHM(studyMinutesFor(d))}` });
    }

    for (const t of d.tasksToday) {
      if (!t.done) continue;
      push(k, { id: `${k}-t-${t.id}`, kind: "task", dateKey: k, emoji: "✅", text: t.title });
    }

    if (d.study.win) {
      push(k, { id: `${k}-win`, kind: "win", dateKey: k, emoji: "🏆", text: d.study.win });
    }

    const j = d.journal;
    if (j && (j.feeling || j.wentWell || j.difficult || j.tomorrow)) {
      const parts = [j.feeling, j.wentWell, j.difficult, j.tomorrow].filter(Boolean).join(" · ");
      push(k, { id: `${k}-journal`, kind: "journal", dateKey: k, emoji: "📝", text: "Journal", detail: parts });
    }
  }

  for (const e of s.events ?? []) {
    push(e.date, { id: `e-${e.id}`, kind: "event", dateKey: e.date, emoji: "📅", text: e.name, detail: e.note });
  }

  return byDate;
}
