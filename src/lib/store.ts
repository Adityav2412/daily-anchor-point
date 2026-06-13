import { useEffect, useSyncExternalStore } from "react";
import { istDateKey, istMidnightMs, lastNDays, nowIST } from "./ist";

export type HabitCategory = "non-negotiable" | "adapting" | "mental" | "physical" | "custom";
export interface Habit {
  id: string;
  name: string;
  category: HabitCategory;
  icon?: string;
  createdAt: string;
}
export interface HabitLog { done: boolean; reason?: string; }
export type ReminderOffset = 0 | 15 | 60 | 1440;
export type EventOffset = 0 | 1440 | 4320 | 10080;
export type TaskCategory = "health" | "personal" | "study" | "general";
export interface TaskItem {
  id: string;
  title: string;
  priority: "normal" | "high";
  done: boolean;
  createdAt: string;
  remindAt?: string;
  reminded?: boolean;
  isStudy?: boolean;
  category?: TaskCategory;
  reminderOffsetMin?: ReminderOffset;
  dueDate?: string; // YYYY-MM-DD for Upcoming tasks
}

const STUDY_KEYWORDS = ["learn", "read", "study", "revise", "revision", "practice", "chapter", "topic", "lecture", "notes", "exam", "syllabus", "assignment", "homework"];
export function detectStudyTask(title: string): boolean {
  const t = title.toLowerCase();
  return STUDY_KEYWORDS.some((k) => new RegExp(`\\b${k}`, "i").test(t));
}
export interface Settings { eodReminderEnabled: boolean; eodMinutesBefore: number; geminiApiKey?: string; notificationsEnabled?: boolean; }
export interface StudyEntry { subject: string; minutes: number; }
export interface StudySession { id: string; subject: string; startISO: string; endISO: string; durationMin: number; feeling?: "hard" | "okay" | "good"; }
export interface TimeBlock { id: string; label: string; kind: "study" | "work" | "habits" | "rest" | "free"; start: string; end: string; done?: boolean; reason?: string; notified?: boolean; }
export interface TimeLogEntry { id: string; activity: string; start: string; end: string; }
export interface TimeSession { id: string; category: string; startISO: string; endISO: string; durationMin: number; }
export interface Intention { goal: string; energy: number; habitId?: string; setAt: string; }
export interface ToughDay { note?: string; at: string; }
export interface RestDay { note?: string; at: string; }
export interface NightSetup { sleepIntention?: string; at: string; }
export interface PlanStatus { done: boolean; reason?: string; }

export type Mood = "difficult" | "okay" | "good" | "great";
export type Energy = "low" | "medium" | "high";

export interface JournalEntry {
  feeling?: string;
  wentWell?: string;
  difficult?: string;
  tomorrow?: string;
}

export interface DayData {
  habits: Record<string, HabitLog>;
  study: {
    studiedToday?: boolean;
    notStudiedReason?: string;
    entries: StudyEntry[];
    sessions: StudySession[];
    tomorrowPlan: string;
    energy?: number;
    win?: string;
    reflection?: string;
    planStatus?: PlanStatus;
  };
  tasksToday: TaskItem[];
  tasksTomorrow: TaskItem[];
  tasksUpcoming?: TaskItem[];
  availableHours?: number;
  blocks: TimeBlock[];
  timeLog: TimeLogEntry[];
  timeSessions: TimeSession[];
  intention?: Intention;
  intentionText?: string;
  toughDay?: ToughDay;
  restDay?: RestDay;
  nightSetup?: NightSetup;
  lastRolloverKey?: string;

  // LIFE additions
  mood?: Mood;
  energy?: Energy;
  focus?: string;
  journal?: JournalEntry;
}

export interface CalendarEvent {
  id: string;
  name: string;
  date: string;
  note?: string;
  category?: string;
  reminderOffsetMin?: EventOffset;
  createdAt: string;
}

export interface MemoryItem { id: string; text: string; dateKey: string; createdAt: string; }
export interface GardenState { stage: number; lastGrowKey?: string; lastMsgKey?: string; lastMsgIdx?: number; }
export interface MissedReminder { id: string; key: string; title: string; body?: string; scheduledAt: string; }

export interface State {
  version?: number;
  habits: Habit[];
  days: Record<string, DayData>;
  settings?: Settings;
  eodNotifiedKey?: string;
  dataStartKey?: string;
  customCategories?: string[];
  events?: CalendarEvent[];

  // LIFE additions
  memoryJar?: MemoryItem[];
  garden?: GardenState;
  archivedHabits?: Habit[];
  firedReminders?: Record<string, number>; // key -> ms fired at
  missedReminders?: MissedReminder[];
}

export const STATE_VERSION = 1;

const KEY = "life_state_v1";

// Day 1 of the LIFE journey. Nothing before this date is shown or counted.
export const LIFE_START_KEY = "2026-06-15";

function emptyDay(): DayData {
  return { habits: {}, study: { entries: [], sessions: [], tomorrowPlan: "" }, tasksToday: [], tasksTomorrow: [], tasksUpcoming: [], blocks: [], timeLog: [], timeSessions: [] };
}

const EMPTY_DAY = emptyDay();

function emptyState(): State {
  return {
    version: STATE_VERSION,
    habits: [],
    days: {},
    dataStartKey: LIFE_START_KEY,
    customCategories: [],
    events: [],
    memoryJar: [],
    garden: { stage: 0 },
    archivedHabits: [],
    firedReminders: {},
    missedReminders: [],
  };
}

function load(): State {
  if (typeof window === "undefined") return { habits: [], days: {} };
  let parsed: State | null = null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) parsed = JSON.parse(raw);
  } catch {}
  const base: State = parsed ?? emptyState();
  base.version = base.version ?? STATE_VERSION;
  base.habits = base.habits ?? [];
  base.days = base.days ?? {};
  base.dataStartKey = LIFE_START_KEY;
  if (!base.customCategories) base.customCategories = [];
  if (!base.events) base.events = [];
  if (!base.memoryJar) base.memoryJar = [];
  if (!base.garden) base.garden = { stage: 0 };
  if (!base.archivedHabits) base.archivedHabits = [];
  if (!base.firedReminders) base.firedReminders = {};
  if (!base.missedReminders) base.missedReminders = [];
  try { localStorage.setItem(KEY, JSON.stringify(base)); } catch {}
  return base;
}

let state: State = load();
const listeners = new Set<() => void>();

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY || !e.newValue) return;
    try {
      const incoming = JSON.parse(e.newValue) as State;
      incoming.days = incoming.days ?? {};
      if (!incoming.customCategories) incoming.customCategories = [];
      if (!incoming.events) incoming.events = [];
      if (!incoming.memoryJar) incoming.memoryJar = [];
      if (!incoming.garden) incoming.garden = { stage: 0 };
      if (!incoming.archivedHabits) incoming.archivedHabits = [];
      state = incoming;
      listeners.forEach((l) => l());
    } catch {}
  });
}

export const store = {
  get: () => state,
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
  set(updater: (s: State) => State) { state = updater(structuredClone(state)); persist(); },
  ensureDay(key: string) {
    if (!state.days[key]) {
      state = structuredClone(state);
      state.days[key] = emptyDay();
      persist();
    }
  },
  rolloverIfNeeded() {
    const today = istDateKey();
    store.ensureDay(today);
    const day = state.days[today];
    if (day.lastRolloverKey === today) return;
    const yest = lastNDays(2)[0];
    const yDay = state.days[yest];
    state = structuredClone(state);
    if (yDay && yDay.tasksTomorrow.length && !state.days[today].tasksToday.some((t) => yDay.tasksTomorrow.find((x) => x.id === t.id))) {
      state.days[today].tasksToday = [...state.days[today].tasksToday, ...yDay.tasksTomorrow];
    }
    // promote upcoming tasks whose dueDate is today
    if (yDay && yDay.tasksUpcoming?.length) {
      const due = yDay.tasksUpcoming.filter((t) => t.dueDate === today);
      if (due.length) state.days[today].tasksToday.push(...due);
      state.days[yest].tasksUpcoming = yDay.tasksUpcoming.filter((t) => t.dueDate !== today);
    }
    state.days[today].lastRolloverKey = today;
    persist();
  },
};

export function useStore<T>(selector: (s: State) => T): T {
  const sub = (cb: () => void) => store.subscribe(cb);
  const snap = () => selector(state);
  return useSyncExternalStore(sub, snap, snap);
}

export function useToday() {
  const key = istDateKey();
  useEffect(() => { store.ensureDay(key); store.rolloverIfNeeded(); }, [key]);
  return useStore((s) => s.days[key] ?? EMPTY_DAY);
}

export function yesterdayKey(): string {
  return lastNDays(2)[0];
}

export const actions = {
  addHabit(name: string, category: HabitCategory, icon?: string) {
    store.set((s) => { s.habits.push({ id: crypto.randomUUID(), name, category, icon: icon || "🌿", createdAt: new Date().toISOString() }); return s; });
  },
  updateHabit(id: string, patch: Partial<Habit>) {
    store.set((s) => { const h = s.habits.find((x) => x.id === id); if (h) Object.assign(h, patch); return s; });
  },
  removeHabit(id: string) {
    store.set((s) => { s.habits = s.habits.filter((h) => h.id !== id); return s; });
  },
  archiveHabit(id: string) {
    store.set((s) => {
      const h = s.habits.find((x) => x.id === id);
      if (h) {
        s.archivedHabits = s.archivedHabits ?? [];
        s.archivedHabits.push(h);
        s.habits = s.habits.filter((x) => x.id !== id);
      }
      return s;
    });
  },
  restoreHabit(id: string) {
    store.set((s) => {
      const h = (s.archivedHabits ?? []).find((x) => x.id === id);
      if (h) {
        s.habits.push(h);
        s.archivedHabits = (s.archivedHabits ?? []).filter((x) => x.id !== id);
      }
      return s;
    });
  },
  toggleHabit(habitId: string, done: boolean, reason?: string) {
    const key = istDateKey();
    store.set((s) => {
      if (!s.days[key]) s.days[key] = emptyDay();
      s.days[key].habits[habitId] = { done, reason: done ? undefined : reason };
      return s;
    });
  },

  setMood(mood: Mood) {
    const key = istDateKey();
    store.set((s) => { if (!s.days[key]) s.days[key] = emptyDay(); s.days[key].mood = mood; return s; });
  },
  setEnergy(energy: Energy) {
    const key = istDateKey();
    store.set((s) => { if (!s.days[key]) s.days[key] = emptyDay(); s.days[key].energy = energy; return s; });
  },
  setFocus(text: string) {
    const key = istDateKey();
    store.set((s) => { if (!s.days[key]) s.days[key] = emptyDay(); s.days[key].focus = text.trim() || undefined; return s; });
  },
  setJournal(patch: Partial<JournalEntry>, dateKey?: string) {
    const key = dateKey ?? istDateKey();
    store.set((s) => {
      if (!s.days[key]) s.days[key] = emptyDay();
      s.days[key].journal = { ...(s.days[key].journal ?? {}), ...patch };
      return s;
    });
  },
  addMemory(text: string, dateKey?: string) {
    const dk = dateKey ?? istDateKey();
    store.set((s) => {
      s.memoryJar = s.memoryJar ?? [];
      s.memoryJar.unshift({ id: crypto.randomUUID(), text: text.trim(), dateKey: dk, createdAt: new Date().toISOString() });
      return s;
    });
  },
  updateMemory(id: string, text: string) {
    store.set((s) => { const m = (s.memoryJar ?? []).find((x) => x.id === id); if (m) m.text = text.trim(); return s; });
  },
  removeMemory(id: string) {
    store.set((s) => { s.memoryJar = (s.memoryJar ?? []).filter((m) => m.id !== id); return s; });
  },
  setGarden(patch: Partial<GardenState>) {
    store.set((s) => { s.garden = { ...(s.garden ?? { stage: 0 }), ...patch }; return s; });
  },

  setStudy(patch: Partial<DayData["study"]>) {
    const key = istDateKey();
    store.set((s) => {
      if (!s.days[key]) s.days[key] = emptyDay();
      s.days[key].study = { ...s.days[key].study, ...patch };
      return s;
    });
  },
  addStudyEntry(e: StudyEntry) {
    const key = istDateKey();
    store.set((s) => { if (!s.days[key]) s.days[key] = emptyDay(); s.days[key].study.entries.push(e); return s; });
  },
  removeStudyEntry(idx: number) {
    const key = istDateKey();
    store.set((s) => { s.days[key].study.entries.splice(idx, 1); return s; });
  },
  addStudySession(sess: Omit<StudySession, "id">) {
    const key = istDateKey();
    store.set((s) => {
      if (!s.days[key]) s.days[key] = emptyDay();
      if (!s.days[key].study.sessions) s.days[key].study.sessions = [];
      const id = crypto.randomUUID();
      s.days[key].study.sessions.push({ ...sess, id });
      s.days[key].study.studiedToday = true;
      if (!s.days[key].timeSessions) s.days[key].timeSessions = [];
      s.days[key].timeSessions.push({ id, category: "Study", startISO: sess.startISO, endISO: sess.endISO, durationMin: sess.durationMin });
      return s;
    });
  },
  removeStudySession(id: string) {
    const key = istDateKey();
    store.set((s) => {
      s.days[key].study.sessions = (s.days[key].study.sessions ?? []).filter((x) => x.id !== id);
      s.days[key].timeSessions = (s.days[key].timeSessions ?? []).filter((x) => x.id !== id);
      return s;
    });
  },
  setPlanStatus(status: PlanStatus | undefined) {
    const key = istDateKey();
    store.set((s) => { if (!s.days[key]) s.days[key] = emptyDay(); s.days[key].study.planStatus = status; return s; });
  },
  addCustomCategory(name: string) {
    store.set((s) => {
      if (!s.customCategories) s.customCategories = [];
      const n = name.trim();
      if (n && !s.customCategories.includes(n)) s.customCategories.push(n);
      return s;
    });
  },
  addTask(scope: "today" | "tomorrow" | "upcoming", title: string, priority: "normal" | "high", isStudy?: boolean, remindAt?: string, extras?: { category?: TaskCategory; reminderOffsetMin?: ReminderOffset; dueDate?: string }): string {
    const key = istDateKey();
    const id = crypto.randomUUID();
    store.set((s) => {
      if (!s.days[key]) s.days[key] = emptyDay();
      const study = isStudy ?? detectStudyTask(title);
      const t: TaskItem = {
        id, title, priority, done: false, createdAt: new Date().toISOString(),
        isStudy: study, remindAt: remindAt || undefined, reminded: false,
        category: extras?.category, reminderOffsetMin: extras?.reminderOffsetMin, dueDate: extras?.dueDate,
      };
      if (scope === "today") s.days[key].tasksToday.push(t);
      else if (scope === "tomorrow") s.days[key].tasksTomorrow.push(t);
      else { s.days[key].tasksUpcoming = s.days[key].tasksUpcoming ?? []; s.days[key].tasksUpcoming!.push(t); }
      if (scope === "tomorrow" && study) {
        const existing = (s.days[key].study.tomorrowPlan ?? "").trim();
        const lines = existing ? existing.split("\n").map((l) => l.replace(/^•\s*/, "").trim()) : [];
        if (!lines.includes(title.trim())) {
          s.days[key].study.tomorrowPlan = (existing ? existing + "\n" : "") + `• ${title.trim()}`;
        }
      }
      return s;
    });
    return id;
  },
  toggleTask(scope: "today" | "tomorrow" | "upcoming", id: string) {
    const key = istDateKey();
    store.set((s) => {
      const arr = scope === "today" ? s.days[key].tasksToday : scope === "tomorrow" ? s.days[key].tasksTomorrow : (s.days[key].tasksUpcoming ?? []);
      const t = arr.find((x) => x.id === id); if (t) t.done = !t.done;
      return s;
    });
  },
  removeTask(scope: "today" | "tomorrow" | "upcoming", id: string) {
    const key = istDateKey();
    store.set((s) => {
      if (scope === "today") s.days[key].tasksToday = s.days[key].tasksToday.filter((t) => t.id !== id);
      else if (scope === "tomorrow") s.days[key].tasksTomorrow = s.days[key].tasksTomorrow.filter((t) => t.id !== id);
      else s.days[key].tasksUpcoming = (s.days[key].tasksUpcoming ?? []).filter((t) => t.id !== id);
      return s;
    });
  },
  setTaskReminder(scope: "today" | "tomorrow" | "upcoming", id: string, remindAt: string | null) {
    const key = istDateKey();
    store.set((s) => {
      const arr = scope === "today" ? s.days[key].tasksToday : scope === "tomorrow" ? s.days[key].tasksTomorrow : (s.days[key].tasksUpcoming ?? []);
      const t = arr.find((x) => x.id === id);
      if (t) { t.remindAt = remindAt || undefined; t.reminded = false; }
      return s;
    });
  },
  markTaskReminded(id: string) {
    const key = istDateKey();
    store.set((s) => {
      const t = s.days[key]?.tasksToday.find((x) => x.id === id);
      if (t) t.reminded = true;
      return s;
    });
  },
  setIntentionText(text: string) {
    const key = istDateKey();
    store.set((s) => { if (!s.days[key]) s.days[key] = emptyDay(); s.days[key].intentionText = text.trim() || undefined; return s; });
  },
  logToughDay(note?: string) {
    const key = istDateKey();
    store.set((s) => { if (!s.days[key]) s.days[key] = emptyDay(); s.days[key].toughDay = { note: note?.trim() || undefined, at: new Date().toISOString() }; return s; });
  },
  logRestDay(note?: string) {
    const key = istDateKey();
    store.set((s) => { if (!s.days[key]) s.days[key] = emptyDay(); s.days[key].restDay = { note: note?.trim() || undefined, at: new Date().toISOString() }; return s; });
  },
  clearRestDay() {
    const key = istDateKey();
    store.set((s) => { if (s.days[key]) s.days[key].restDay = undefined; return s; });
  },
  setSettings(patch: Partial<Settings>) {
    store.set((s) => { s.settings = { eodReminderEnabled: true, eodMinutesBefore: 30, ...(s.settings || {}), ...patch }; return s; });
  },
  setGeminiKey(key: string) {
    store.set((s) => { s.settings = { eodReminderEnabled: true, eodMinutesBefore: 30, ...(s.settings || {}), geminiApiKey: key.trim() || undefined }; return s; });
  },
  markEodNotified(key: string) {
    store.set((s) => { s.eodNotifiedKey = key; return s; });
  },
  addEvent(name: string, date: string, note?: string, category?: string, reminderOffsetMin?: EventOffset) {
    store.set((s) => {
      if (!s.events) s.events = [];
      s.events.push({ id: crypto.randomUUID(), name: name.trim(), date, note: note?.trim() || undefined, category, reminderOffsetMin, createdAt: new Date().toISOString() });
      return s;
    });
  },
  updateEvent(id: string, patch: Partial<CalendarEvent>) {
    store.set((s) => { const e = (s.events ?? []).find((x) => x.id === id); if (e) Object.assign(e, patch); return s; });
  },
  removeEvent(id: string) {
    store.set((s) => { s.events = (s.events ?? []).filter((e) => e.id !== id); return s; });
  },
  dismissMissedReminder(id: string) {
    store.set((s) => { s.missedReminders = (s.missedReminders ?? []).filter((m) => m.id !== id); return s; });
  },
  clearMissedReminders() {
    store.set((s) => { s.missedReminders = []; return s; });
  },
  exportData(): string {
    return JSON.stringify(store.get(), null, 2);
  },
  importData(json: string): { ok: boolean; error?: string } {
    try {
      const parsed = JSON.parse(json);
      if (!parsed || typeof parsed !== "object" || !parsed.days || !Array.isArray(parsed.habits)) {
        return { ok: false, error: "File doesn't look like a LIFE backup." };
      }
      const merged: State = { ...emptyState(), ...parsed, version: STATE_VERSION, dataStartKey: LIFE_START_KEY };
      state = merged;
      persist();
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || "Invalid JSON." };
    }
  },
  resetAll() {
    state = emptyState();
    persist();
  },
};

export function getSettings(): Settings {
  return store.get().settings ?? { eodReminderEnabled: true, eodMinutesBefore: 30 };
}

function notify(title: string, body?: string) {
  if (typeof window === "undefined") return;
  const enabled = store.get().settings?.notificationsEnabled !== false;
  if (!enabled) return;
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    try { new Notification(title, { body, icon: "/icon-192.png", badge: "/icon-192.png", tag: title }); return; } catch {}
  }
  try {
    const ev = new CustomEvent("daily:in-app-alert", { detail: { title, body } });
    window.dispatchEvent(ev);
  } catch {}
}

// Fire fresh notifications within this window. Older reminders go to the
// persistent Missed Reminders queue instead, so nothing is silently dropped.
const FRESH_WINDOW_MS = 2 * 60 * 1000;
// Drop anything older than this so a long absence doesn't flood the queue.
const STALE_DROP_MS = 7 * 24 * 60 * 60 * 1000;

function fireOrMiss(rkey: string, scheduledMs: number, title: string, body?: string) {
  const s = store.get();
  if ((s.firedReminders ?? {})[rkey]) return;
  const now = Date.now();
  const age = now - scheduledMs;
  if (age > STALE_DROP_MS) {
    store.set((st) => { st.firedReminders = { ...(st.firedReminders ?? {}), [rkey]: now }; return st; });
    return;
  }
  if (age <= FRESH_WINDOW_MS) {
    notify(title, body);
  } else {
    store.set((st) => {
      st.missedReminders = st.missedReminders ?? [];
      if (!st.missedReminders.some((m) => m.key === rkey)) {
        st.missedReminders.unshift({
          id: crypto.randomUUID(),
          key: rkey,
          title,
          body,
          scheduledAt: new Date(scheduledMs).toISOString(),
        });
      }
      return st;
    });
  }
  store.set((st) => { st.firedReminders = { ...(st.firedReminders ?? {}), [rkey]: now }; return st; });
}

export function startMidnightWatcher() {
  if (typeof window === "undefined") return;
  const tick = () => { store.rolloverIfNeeded(); checkReminders(); };
  tick();
  const interval = setInterval(tick, 20 * 1000);
  return () => clearInterval(interval);
}

function checkReminders() {
  const s = store.get();
  const now = Date.now();
  const key = istDateKey();
  const day = s.days[key];
  if (day) {
    for (const t of day.tasksToday) {
      if (t.done || !t.remindAt) continue;
      const ts = new Date(t.remindAt).getTime();
      if (isNaN(ts) || ts > now) continue;
      const rkey = `task:${t.id}:${t.remindAt}`;
      if ((s.firedReminders ?? {})[rkey]) continue;
      fireOrMiss(rkey, ts, "Reminder: " + t.title, "Tap to open your tasks.");
      actions.markTaskReminded(t.id);
    }
  }
  // Calendar event reminders
  for (const e of s.events ?? []) {
    if (e.reminderOffsetMin === undefined || e.reminderOffsetMin === null) continue;
    const eventMs = istMidnightMs(e.date);
    const scheduled = eventMs - e.reminderOffsetMin * 60_000;
    if (scheduled > now) continue;
    const rkey = `event:${e.id}:${e.reminderOffsetMin}`;
    if ((s.firedReminders ?? {})[rkey]) continue;
    const body = e.reminderOffsetMin === 0
      ? "Happening today."
      : e.reminderOffsetMin === 1440
        ? "Tomorrow."
        : e.reminderOffsetMin === 4320
          ? "In 3 days."
          : "In 1 week.";
    fireOrMiss(rkey, scheduled, "📅 " + e.name, body);
  }
}

export function studyMinutesFor(d: DayData | undefined): number {
  if (!d) return 0;
  const sess = (d.study.sessions ?? []).reduce((a, e) => a + e.durationMin, 0);
  const entries = (d.study.entries ?? []).reduce((a, e) => a + e.minutes, 0);
  return sess + entries;
}

export function dayStats(key: string, habits: Habit[]) {
  const d = store.get().days[key];
  if (!d) return { habitPct: 0, studyMinutes: 0, energy: 0 };
  const total = habits.length || 1;
  const done = habits.filter((h) => d.habits[h.id]?.done).length;
  return { habitPct: Math.round((done / total) * 100), studyMinutes: studyMinutesFor(d), energy: d.study.energy ?? 0 };
}

export { nowIST };
