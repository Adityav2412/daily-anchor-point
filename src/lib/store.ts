import { useEffect, useSyncExternalStore } from "react";
import { istDateKey, lastNDays, nowIST } from "./ist";

export type HabitCategory = "non-negotiable" | "adapting";
export interface Habit { id: string; name: string; category: HabitCategory; createdAt: string; }
export interface HabitLog { done: boolean; reason?: string; }
export interface TaskItem { id: string; title: string; priority: "normal" | "high"; done: boolean; createdAt: string; remindAt?: string; reminded?: boolean; }
export interface Settings { eodReminderEnabled: boolean; eodMinutesBefore: number; }
export interface StudyEntry { subject: string; minutes: number; }
export interface StudySession { id: string; subject: string; startISO: string; endISO: string; durationMin: number; }
export interface TimeBlock { id: string; label: string; kind: "study" | "work" | "habits" | "rest" | "free"; start: string; end: string; done?: boolean; reason?: string; notified?: boolean; }
export interface TimeLogEntry { id: string; activity: string; start: string; end: string; }
export interface TimeSession { id: string; category: string; startISO: string; endISO: string; durationMin: number; }
export interface Intention { goal: string; energy: number; habitId?: string; setAt: string; }
export interface ToughDay { note?: string; at: string; }
export interface NightSetup { sleepIntention?: string; at: string; }
export interface PlanStatus { done: boolean; reason?: string; }

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
    planStatus?: PlanStatus; // status of yesterday's plan carried forward
  };
  tasksToday: TaskItem[];
  tasksTomorrow: TaskItem[];
  availableHours?: number;
  blocks: TimeBlock[];
  timeLog: TimeLogEntry[];
  timeSessions: TimeSession[];
  intention?: Intention;
  toughDay?: ToughDay;
  nightSetup?: NightSetup;
  lastRolloverKey?: string;
}

export interface CalendarEvent { id: string; name: string; date: string; note?: string; createdAt: string; }

export interface State {
  habits: Habit[];
  days: Record<string, DayData>;
  settings?: Settings;
  eodNotifiedKey?: string;
  dataStartKey?: string;
  customCategories?: string[];
  events?: CalendarEvent[];
}


const KEY = "focusflow_state_v1";

function emptyDay(): DayData {
  return { habits: {}, study: { entries: [], sessions: [], tomorrowPlan: "" }, tasksToday: [], tasksTomorrow: [], blocks: [], timeLog: [], timeSessions: [] };
}

const EMPTY_DAY = emptyDay();

function backfillDay(d: Partial<DayData> | undefined): DayData {
  const base = emptyDay();
  if (!d) return base;
  return {
    ...base,
    ...d,
    habits: d.habits ?? {},
    study: { tomorrowPlan: "", ...(d.study ?? {}), entries: d.study?.entries ?? [], sessions: d.study?.sessions ?? [] },
    tasksToday: d.tasksToday ?? [],
    tasksTomorrow: d.tasksTomorrow ?? [],
    blocks: d.blocks ?? [],
    timeLog: d.timeLog ?? [],
    timeSessions: d.timeSessions ?? [],
  };
}

function load(): State {
  if (typeof window === "undefined") return { habits: [], days: {} };
  let parsed: State | null = null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) parsed = JSON.parse(raw);
  } catch {}
  const base: State = parsed ?? {
    habits: [
      { id: crypto.randomUUID(), name: "Drink water", category: "non-negotiable", createdAt: new Date().toISOString() },
      { id: crypto.randomUUID(), name: "10 min walk", category: "adapting", createdAt: new Date().toISOString() },
    ],
    days: {},
  };
  const fixed: Record<string, DayData> = {};
  for (const k of Object.keys(base.days || {})) fixed[k] = backfillDay(base.days[k]);
  base.days = fixed;
  if (!base.dataStartKey) base.dataStartKey = istDateKey();
  if (!base.customCategories) base.customCategories = [];
  if (!base.events) base.events = [];

  try { localStorage.setItem(KEY, JSON.stringify(base)); } catch {}
  return base;
}

let state: State = load();
const listeners = new Set<() => void>();

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  listeners.forEach((l) => l());
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
  addHabit(name: string, category: HabitCategory) {
    store.set((s) => { s.habits.push({ id: crypto.randomUUID(), name, category, createdAt: new Date().toISOString() }); return s; });
  },
  removeHabit(id: string) {
    store.set((s) => { s.habits = s.habits.filter((h) => h.id !== id); return s; });
  },
  toggleHabit(habitId: string, done: boolean, reason?: string) {
    const key = istDateKey();
    store.set((s) => {
      if (!s.days[key]) s.days[key] = emptyDay();
      s.days[key].habits[habitId] = { done, reason: done ? undefined : reason };
      return s;
    });
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
    store.set((s) => {
      if (!s.days[key]) s.days[key] = emptyDay();
      s.days[key].study.entries.push(e);
      return s;
    });
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
      s.days[key].study.sessions.push({ ...sess, id: crypto.randomUUID() });
      s.days[key].study.studiedToday = true;
      return s;
    });
  },
  removeStudySession(id: string) {
    const key = istDateKey();
    store.set((s) => { s.days[key].study.sessions = (s.days[key].study.sessions ?? []).filter((x) => x.id !== id); return s; });
  },
  setPlanStatus(status: PlanStatus | undefined) {
    const key = istDateKey();
    store.set((s) => {
      if (!s.days[key]) s.days[key] = emptyDay();
      s.days[key].study.planStatus = status;
      return s;
    });
  },
  addTimeSession(sess: Omit<TimeSession, "id">) {
    const key = istDateKey();
    store.set((s) => {
      if (!s.days[key]) s.days[key] = emptyDay();
      if (!s.days[key].timeSessions) s.days[key].timeSessions = [];
      s.days[key].timeSessions.push({ ...sess, id: crypto.randomUUID() });
      return s;
    });
  },
  removeTimeSession(id: string) {
    const key = istDateKey();
    store.set((s) => { s.days[key].timeSessions = (s.days[key].timeSessions ?? []).filter((x) => x.id !== id); return s; });
  },
  addCustomCategory(name: string) {
    store.set((s) => {
      if (!s.customCategories) s.customCategories = [];
      const n = name.trim();
      if (n && !s.customCategories.includes(n)) s.customCategories.push(n);
      return s;
    });
  },
  addTask(scope: "today" | "tomorrow", title: string, priority: "normal" | "high") {
    const key = istDateKey();
    store.set((s) => {
      if (!s.days[key]) s.days[key] = emptyDay();
      const t: TaskItem = { id: crypto.randomUUID(), title, priority, done: false, createdAt: new Date().toISOString() };
      if (scope === "today") s.days[key].tasksToday.push(t);
      else s.days[key].tasksTomorrow.push(t);
      return s;
    });
  },
  toggleTask(scope: "today" | "tomorrow", id: string) {
    const key = istDateKey();
    store.set((s) => {
      const arr = scope === "today" ? s.days[key].tasksToday : s.days[key].tasksTomorrow;
      const t = arr.find((x) => x.id === id); if (t) t.done = !t.done;
      return s;
    });
  },
  removeTask(scope: "today" | "tomorrow", id: string) {
    const key = istDateKey();
    store.set((s) => {
      if (scope === "today") s.days[key].tasksToday = s.days[key].tasksToday.filter((t) => t.id !== id);
      else s.days[key].tasksTomorrow = s.days[key].tasksTomorrow.filter((t) => t.id !== id);
      return s;
    });
  },
  setAvailableHours(h: number) {
    const key = istDateKey();
    store.set((s) => { if (!s.days[key]) s.days[key] = emptyDay(); s.days[key].availableHours = h; return s; });
  },
  addBlock(b: Omit<TimeBlock, "id">) {
    const key = istDateKey();
    store.set((s) => { if (!s.days[key]) s.days[key] = emptyDay(); s.days[key].blocks.push({ ...b, id: crypto.randomUUID() }); return s; });
  },
  updateBlock(id: string, patch: Partial<TimeBlock>) {
    const key = istDateKey();
    store.set((s) => { const b = s.days[key].blocks.find((x) => x.id === id); if (b) Object.assign(b, patch); return s; });
  },
  removeBlock(id: string) {
    const key = istDateKey();
    store.set((s) => { s.days[key].blocks = s.days[key].blocks.filter((b) => b.id !== id); return s; });
  },
  addTimeLog(entry: Omit<TimeLogEntry, "id">) {
    const key = istDateKey();
    store.set((s) => {
      if (!s.days[key]) s.days[key] = emptyDay();
      if (!s.days[key].timeLog) s.days[key].timeLog = [];
      s.days[key].timeLog.push({ ...entry, id: crypto.randomUUID() });
      return s;
    });
  },
  removeTimeLog(id: string) {
    const key = istDateKey();
    store.set((s) => { s.days[key].timeLog = (s.days[key].timeLog ?? []).filter((t) => t.id !== id); return s; });
  },
  setIntention(intent: Omit<Intention, "setAt">) {
    const key = istDateKey();
    store.set((s) => {
      if (!s.days[key]) s.days[key] = emptyDay();
      s.days[key].intention = { ...intent, setAt: new Date().toISOString() };
      return s;
    });
  },
  clearIntention() {
    const key = istDateKey();
    store.set((s) => { if (s.days[key]) s.days[key].intention = undefined; return s; });
  },
  logToughDay(note?: string) {
    const key = istDateKey();
    store.set((s) => {
      if (!s.days[key]) s.days[key] = emptyDay();
      s.days[key].toughDay = { note: note?.trim() || undefined, at: new Date().toISOString() };
      return s;
    });
  },
  setNightSetup(sleepIntention?: string) {
    const key = istDateKey();
    store.set((s) => {
      if (!s.days[key]) s.days[key] = emptyDay();
      s.days[key].nightSetup = { sleepIntention: sleepIntention?.trim() || undefined, at: new Date().toISOString() };
      return s;
    });
  },
  setTaskReminder(scope: "today" | "tomorrow", id: string, remindAt: string | null) {
    const key = istDateKey();
    store.set((s) => {
      const arr = scope === "today" ? s.days[key].tasksToday : s.days[key].tasksTomorrow;
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
  setSettings(patch: Partial<Settings>) {
    store.set((s) => { s.settings = { eodReminderEnabled: true, eodMinutesBefore: 30, ...(s.settings || {}), ...patch }; return s; });
  },
  markEodNotified(key: string) {
    store.set((s) => { s.eodNotifiedKey = key; return s; });
  },
};

export function getSettings(): Settings {
  return store.get().settings ?? { eodReminderEnabled: true, eodMinutesBefore: 30 };
}

function notify(title: string, body?: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try { new Notification(title, { body, icon: "/favicon.ico", tag: title }); } catch {}
}

export function startMidnightWatcher() {
  if (typeof window === "undefined") return;
  const tick = () => {
    store.rolloverIfNeeded();
    checkReminders();
  };
  tick();
  const interval = setInterval(tick, 20 * 1000);
  return () => clearInterval(interval);
}

function checkReminders() {
  const key = istDateKey();
  const day = store.get().days[key];
  if (!day) return;
  const now = Date.now();
  for (const t of day.tasksToday) {
    if (t.done || !t.remindAt || t.reminded) continue;
    const ts = new Date(t.remindAt).getTime();
    if (!isNaN(ts) && ts <= now && now - ts < 15 * 60 * 1000) {
      notify("Reminder: " + t.title, "Tap to open your tasks.");
      actions.markTaskReminded(t.id);
    }
  }
  const settings = getSettings();
  if (settings.eodReminderEnabled && store.get().eodNotifiedKey !== key) {
    const ist = nowIST();
    const endOfDay = new Date(ist); endOfDay.setHours(23, 59, 0, 0);
    const triggerAt = endOfDay.getTime() - settings.eodMinutesBefore * 60 * 1000;
    if (ist.getTime() >= triggerAt) {
      const incomplete = day.tasksToday.filter((t) => !t.done);
      if (incomplete.length > 0) {
        notify(`${incomplete.length} task${incomplete.length === 1 ? "" : "s"} still open`, incomplete.slice(0, 3).map((t) => "• " + t.title).join("\n"));
      }
      actions.markEodNotified(key);
    }
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
