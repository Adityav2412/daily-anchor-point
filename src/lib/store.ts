import { useEffect, useSyncExternalStore } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { istDateKey, istMidnightMs, lastNDays, nowIST } from "./ist";

// ============================================================================
// LIFE — store
// Single source of truth for: habits, days (sleep + habit logs + tasks),
// calendar events, wins (Memory Jar), garden/forest, settings, missed reminders.
// No mood / energy / study / journal / sleep-duration analytics.
// ============================================================================

export type HabitCategory = "non-negotiable" | "adapting";
export interface Habit {
  id: string;
  name: string;
  category: HabitCategory;
  icon?: string;
  createdAt: string;
  order?: number;
}
export interface HabitLog { done: boolean; reason?: string; }

export type ReminderOffset = 0 | 15 | 60 | 1440;
export type EventOffset = 0 | 1440 | 4320 | 10080;

export interface TaskItem {
  id: string;
  title: string;
  priority: "normal" | "high";
  done: boolean;
  createdAt: string;
  remindAt?: string;
  reminded?: boolean;
  reminderOffsetMin?: ReminderOffset;
  dueDate?: string; // YYYY-MM-DD; present for upcoming tasks
}

export interface Settings {
  geminiApiKey?: string;
  notificationsEnabled?: boolean;
}

export interface ToughDay { note?: string; at: string; }
export interface SleepData { sleptAt?: string; wokeAt?: string; }

export interface DayData {
  habits: Record<string, HabitLog>;
  tasksToday: TaskItem[];
  tasksUpcoming?: TaskItem[];
  sleep?: SleepData;
  toughDay?: ToughDay;
  lastRolloverKey?: string;
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
  archivedHabits?: Habit[];
  days: Record<string, DayData>;
  events?: CalendarEvent[];
  memoryJar?: MemoryItem[];
  garden?: GardenState;
  settings?: Settings;
  dataStartKey?: string;
  firedReminders?: Record<string, number>;
  missedReminders?: MissedReminder[];
}

export const STATE_VERSION = 1;
const KEY = "life_state_v1";

// Day 1 of the LIFE journey. Nothing before this date is shown or counted.
export const LIFE_START_KEY = "2026-06-15";

function emptyDay(): DayData {
  return { habits: {}, tasksToday: [], tasksUpcoming: [] };
}

const EMPTY_DAY: DayData = emptyDay();

function emptyState(): State {
  return {
    version: STATE_VERSION,
    habits: [],
    archivedHabits: [],
    days: {},
    events: [],
    memoryJar: [],
    garden: { stage: 0 },
    dataStartKey: LIFE_START_KEY,
    firedReminders: {},
    missedReminders: [],
  };
}

// Sanitize a day to keep ONLY current-model fields. Strips legacy keys
// (study, mood, energy, focus, journal, intention, blocks, timeLog, tasksTomorrow, etc.).
function sanitizeDay(raw: any): DayData {
  if (!raw || typeof raw !== "object") return emptyDay();
  const d: DayData = {
    habits: raw.habits && typeof raw.habits === "object" ? raw.habits : {},
    tasksToday: Array.isArray(raw.tasksToday) ? raw.tasksToday.map(sanitizeTask) : [],
    tasksUpcoming: Array.isArray(raw.tasksUpcoming) ? raw.tasksUpcoming.map(sanitizeTask) : [],
    lastRolloverKey: typeof raw.lastRolloverKey === "string" ? raw.lastRolloverKey : undefined,
  };
  if (raw.sleep && typeof raw.sleep === "object") {
    d.sleep = {
      sleptAt: typeof raw.sleep.sleptAt === "string" ? raw.sleep.sleptAt : undefined,
      wokeAt: typeof raw.sleep.wokeAt === "string" ? raw.sleep.wokeAt : undefined,
    };
  }
  if (raw.toughDay && typeof raw.toughDay === "object") {
    d.toughDay = { note: raw.toughDay.note, at: raw.toughDay.at };
  }
  // Salvage a legacy `study.win` as a Memory Jar entry — handled in sanitizeState.
  return d;
}

function sanitizeTask(t: any): TaskItem {
  return {
    id: typeof t?.id === "string" ? t.id : crypto.randomUUID(),
    title: String(t?.title ?? ""),
    priority: t?.priority === "high" ? "high" : "normal",
    done: !!t?.done,
    createdAt: typeof t?.createdAt === "string" ? t.createdAt : new Date().toISOString(),
    remindAt: typeof t?.remindAt === "string" ? t.remindAt : undefined,
    reminded: !!t?.reminded,
    reminderOffsetMin: [0, 15, 60, 1440].includes(t?.reminderOffsetMin) ? t.reminderOffsetMin : undefined,
    dueDate: typeof t?.dueDate === "string" ? t.dueDate : undefined,
  };
}

function migrateCategory(c: any): HabitCategory {
  if (c === "non-negotiable") return "non-negotiable";
  if (c === "mental") return "non-negotiable";
  return "adapting"; // adapting | physical | custom | anything else
}

function sanitizeState(parsed: any): State {
  const base: State = emptyState();
  if (!parsed || typeof parsed !== "object") return base;

  base.version = STATE_VERSION;
  base.habits = Array.isArray(parsed.habits)
    ? parsed.habits.map((h: any, i: number) => ({
        id: String(h?.id ?? crypto.randomUUID()),
        name: String(h?.name ?? ""),
        category: migrateCategory(h?.category),
        icon: typeof h?.icon === "string" ? h.icon : "🌿",
        createdAt: typeof h?.createdAt === "string" ? h.createdAt : new Date().toISOString(),
        order: typeof h?.order === "number" ? h.order : i,
      }))
    : [];
  base.archivedHabits = Array.isArray(parsed.archivedHabits)
    ? parsed.archivedHabits.map((h: any) => ({ ...h, category: migrateCategory(h?.category) }))
    : [];

  // Days
  base.days = {};
  const salvagedWins: MemoryItem[] = [];
  if (parsed.days && typeof parsed.days === "object") {
    for (const k of Object.keys(parsed.days)) {
      base.days[k] = sanitizeDay(parsed.days[k]);
      // Salvage legacy `study.win` as a Memory Jar entry if not already present.
      const legacyWin = parsed.days[k]?.study?.win;
      if (typeof legacyWin === "string" && legacyWin.trim()) {
        salvagedWins.push({
          id: crypto.randomUUID(),
          text: legacyWin.trim(),
          dateKey: k,
          createdAt: parsed.days[k]?.study?.win_at ?? new Date().toISOString(),
        });
      }
    }
  }

  base.events = Array.isArray(parsed.events)
    ? parsed.events.map((e: any) => ({
        id: String(e?.id ?? crypto.randomUUID()),
        name: String(e?.name ?? ""),
        date: String(e?.date ?? ""),
        note: e?.note,
        category: e?.category,
        reminderOffsetMin: [0, 1440, 4320, 10080].includes(e?.reminderOffsetMin) ? e.reminderOffsetMin : undefined,
        createdAt: typeof e?.createdAt === "string" ? e.createdAt : new Date().toISOString(),
      }))
    : [];

  // Memory Jar — single source of truth for wins. Merge salvaged legacy wins.
  const jarFromBackup: MemoryItem[] = Array.isArray(parsed.memoryJar)
    ? parsed.memoryJar.map((m: any) => ({
        id: String(m?.id ?? crypto.randomUUID()),
        text: String(m?.text ?? ""),
        dateKey: String(m?.dateKey ?? istDateKey()),
        createdAt: typeof m?.createdAt === "string" ? m.createdAt : new Date().toISOString(),
      }))
    : [];
  const seenByDate = new Set(jarFromBackup.map((m) => m.dateKey));
  for (const w of salvagedWins) {
    if (!seenByDate.has(w.dateKey)) {
      jarFromBackup.push(w);
      seenByDate.add(w.dateKey);
    }
  }
  base.memoryJar = jarFromBackup;

  base.garden = parsed.garden && typeof parsed.garden === "object"
    ? { stage: Number(parsed.garden.stage ?? 0) || 0, lastGrowKey: parsed.garden.lastGrowKey, lastMsgKey: parsed.garden.lastMsgKey, lastMsgIdx: parsed.garden.lastMsgIdx }
    : { stage: 0 };

  base.settings = parsed.settings && typeof parsed.settings === "object"
    ? { geminiApiKey: parsed.settings.geminiApiKey, notificationsEnabled: parsed.settings.notificationsEnabled }
    : {};

  base.firedReminders = parsed.firedReminders && typeof parsed.firedReminders === "object" ? parsed.firedReminders : {};
  base.missedReminders = Array.isArray(parsed.missedReminders) ? parsed.missedReminders : [];
  base.dataStartKey = LIFE_START_KEY;
  return base;
}

function load(): State {
  if (typeof window === "undefined") return emptyState();

  // One-time database reset for June 15, 2026
  const resetKey = "life_june15_reset_v3";
  if (localStorage.getItem(resetKey) !== "true") {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          parsed.days = {}; // Wipe history
          parsed.memoryJar = []; // Clear wins
          parsed.garden = { stage: 0 }; // Reset garden
          parsed.missedReminders = [];
          parsed.firedReminders = {};
          parsed.dataStartKey = "2026-06-15";
          localStorage.setItem(KEY, JSON.stringify(parsed));
        }
      }
      localStorage.setItem(resetKey, "true");
    } catch {}
  }

  let parsed: any = null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) parsed = JSON.parse(raw);
  } catch {}
  const clean = sanitizeState(parsed);
  try { localStorage.setItem(KEY, JSON.stringify(clean)); } catch {}
  return clean;
}

let state: State = load();
const listeners = new Set<() => void>();

// Debounce localStorage writes — coalesce multiple `set` calls in the same tick
// into a single JSON.stringify+write. UI listeners still notified synchronously.
let writeScheduled = false;
function scheduleWrite() {
  if (writeScheduled) return;
  writeScheduled = true;
  const flush = () => {
    writeScheduled = false;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  };
  // Prefer rIC when available so the write doesn't block paint.
  const w = window as any;
  if (typeof w.requestIdleCallback === "function") {
    w.requestIdleCallback(flush, { timeout: 500 });
  } else {
    setTimeout(flush, 0);
  }
}

function notify() { listeners.forEach((l) => l()); }

function persist() {
  scheduleWrite();
  notify();
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY || !e.newValue) return;
    try {
      state = sanitizeState(JSON.parse(e.newValue));
      notify();
    } catch {}
  });
  // Best-effort flush before unload so a pending write isn't lost.
  window.addEventListener("beforeunload", () => {
    if (writeScheduled) {
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
      writeScheduled = false;
    }
  });
}

export const store = {
  get: () => state,
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
  set(updater: (s: State) => State) {
    const next = updater(structuredClone(state));
    if (next === state) return; // updater opted out
    state = next;
    persist();
  },
  // Mutate without notifying React listeners — for background bookkeeping
  // (e.g. firedReminders) that should not cause re-renders.
  setQuiet(updater: (s: State) => State) {
    const next = updater(structuredClone(state));
    if (next === state) return;
    state = next;
    scheduleWrite();
  },
  ensureDay(key: string) {
    if (!state.days[key]) {
      state = { ...state, days: { ...state.days, [key]: emptyDay() } };
      persist();
    }
  },
  // Promote upcoming tasks (from any day) whose dueDate is today into today's tasksToday.
  rolloverIfNeeded() {
    const today = istDateKey();
    store.ensureDay(today);
    if (state.days[today].lastRolloverKey === today) return;
    state = structuredClone(state);
    const todays = state.days[today];
    const existingIds = new Set(todays.tasksToday.map((t) => t.id));
    for (const k of Object.keys(state.days)) {
      if (k === today) continue;
      const list = state.days[k].tasksUpcoming ?? [];
      if (!list.length) continue;
      const due = list.filter((t) => t.dueDate === today && !existingIds.has(t.id));
      if (due.length) {
        for (const t of due) { todays.tasksToday.push(t); existingIds.add(t.id); }
        state.days[k].tasksUpcoming = list.filter((t) => t.dueDate !== today);
      }
    }
    todays.lastRolloverKey = today;
    persist();
  },
};

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore((cb) => store.subscribe(cb), () => selector(state), () => selector(state));
}

export function useToday() {
  const key = istDateKey();
  useEffect(() => { store.ensureDay(key); store.rolloverIfNeeded(); }, [key]);
  return useStore((s) => s.days[key] ?? EMPTY_DAY);
}

export function yesterdayKey(): string {
  return lastNDays(2)[0];
}

// ============================================================================
// Actions
// ============================================================================

export const actions = {
  // Habits
  addHabit(name: string, category: HabitCategory, icon?: string) {
    store.set((s) => {
      const order = (s.habits.reduce((a, h) => Math.max(a, h.order ?? 0), 0)) + 1;
      s.habits.push({ id: crypto.randomUUID(), name, category, icon: icon || "🌿", createdAt: new Date().toISOString(), order });
      return s;
    });
  },
  reorderHabits(orderedIds: string[]) {
    store.set((s) => {
      const map = new Map(orderedIds.map((id, i) => [id, i]));
      s.habits.forEach((h) => { if (map.has(h.id)) h.order = map.get(h.id)!; });
      s.habits.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      return s;
    });
  },
  moveHabit(id: string, category: HabitCategory, beforeId?: string) {
    store.set((s) => {
      const h = s.habits.find((x) => x.id === id);
      if (!h) return s;
      h.category = category;
      const others = s.habits.filter((x) => x.id !== id && x.category === category).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const targetIdx = beforeId ? others.findIndex((x) => x.id === beforeId) : -1;
      const newList = [...others];
      if (targetIdx >= 0) newList.splice(targetIdx, 0, h); else newList.push(h);
      newList.forEach((x, i) => { x.order = i; });
      return s;
    });
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

  // Sleep — store only Slept At and Woke Up At. No duration / score / quality / debt.
  setSleep(patch: Partial<SleepData>, dateKey?: string) {
    const key = dateKey ?? istDateKey();
    store.set((s) => {
      if (!s.days[key]) s.days[key] = emptyDay();
      const cur = s.days[key].sleep ?? {};
      s.days[key].sleep = {
        sleptAt: "sleptAt" in patch ? patch.sleptAt : cur.sleptAt,
        wokeAt: "wokeAt" in patch ? patch.wokeAt : cur.wokeAt,
      };
      return s;
    });
  },

  // Tough day
  logToughDay(note?: string) {
    const key = istDateKey();
    store.set((s) => {
      if (!s.days[key]) s.days[key] = emptyDay();
      s.days[key].toughDay = { note: note?.trim() || undefined, at: new Date().toISOString() };
      return s;
    });
  },

  // Memory Jar = single source of truth for wins.
  addMemory(text: string, dateKey?: string) {
    const dk = dateKey ?? istDateKey();
    store.set((s) => {
      s.memoryJar = s.memoryJar ?? [];
      s.memoryJar.unshift({ id: crypto.randomUUID(), text: text.trim(), dateKey: dk, createdAt: new Date().toISOString() });
      return s;
    });
  },
  setTodayWin(text: string, dateKey?: string) {
    const dk = dateKey ?? istDateKey();
    const t = text.trim();
    store.set((s) => {
      s.memoryJar = s.memoryJar ?? [];
      const existing = s.memoryJar.find((m) => m.dateKey === dk);
      if (!t) {
        if (existing) s.memoryJar = s.memoryJar.filter((m) => m.id !== existing.id);
      } else if (existing) {
        existing.text = t;
      } else {
        s.memoryJar.unshift({ id: crypto.randomUUID(), text: t, dateKey: dk, createdAt: new Date().toISOString() });
      }
      return s;
    });
  },
  updateMemory(id: string, text: string) {
    store.set((s) => { const m = (s.memoryJar ?? []).find((x) => x.id === id); if (m) m.text = text.trim(); return s; });
  },
  removeMemory(id: string) {
    store.set((s) => { s.memoryJar = (s.memoryJar ?? []).filter((m) => m.id !== id); return s; });
  },

  // Garden
  setGarden(patch: Partial<GardenState>) {
    store.set((s) => { s.garden = { ...(s.garden ?? { stage: 0 }), ...patch }; return s; });
  },

  // Tasks (Agenda)
  addTask(scope: "today" | "upcoming", title: string, priority: "normal" | "high", _legacy?: unknown, remindAt?: string, extras?: { reminderOffsetMin?: ReminderOffset; dueDate?: string }): string {
    const key = istDateKey();
    const id = crypto.randomUUID();
    store.set((s) => {
      if (!s.days[key]) s.days[key] = emptyDay();
      const t: TaskItem = {
        id, title, priority, done: false, createdAt: new Date().toISOString(),
        remindAt: remindAt || undefined, reminded: false,
        reminderOffsetMin: extras?.reminderOffsetMin, dueDate: extras?.dueDate,
      };
      if (scope === "today") s.days[key].tasksToday.push(t);
      else { s.days[key].tasksUpcoming = s.days[key].tasksUpcoming ?? []; s.days[key].tasksUpcoming!.push(t); }
      return s;
    });
    return id;
  },
  toggleTask(scope: "today" | "upcoming", id: string) {
    store.set((s) => {
      for (const k of Object.keys(s.days)) {
        const arr = scope === "today" ? s.days[k].tasksToday : (s.days[k].tasksUpcoming ?? []);
        const t = arr.find((x) => x.id === id);
        if (t) { t.done = !t.done; return s; }
      }
      return s;
    });
  },
  removeTask(scope: "today" | "upcoming", id: string) {
    store.set((s) => {
      for (const k of Object.keys(s.days)) {
        if (scope === "today") {
          const before = s.days[k].tasksToday.length;
          s.days[k].tasksToday = s.days[k].tasksToday.filter((t) => t.id !== id);
          if (s.days[k].tasksToday.length !== before) return s;
        } else {
          const list = s.days[k].tasksUpcoming ?? [];
          const next = list.filter((t) => t.id !== id);
          if (next.length !== list.length) { s.days[k].tasksUpcoming = next; return s; }
        }
      }
      return s;
    });
  },
  setTaskReminder(scope: "today" | "upcoming", id: string, remindAt: string | null) {
    store.set((s) => {
      for (const k of Object.keys(s.days)) {
        const arr = scope === "today" ? s.days[k].tasksToday : (s.days[k].tasksUpcoming ?? []);
        const t = arr.find((x) => x.id === id);
        if (t) { t.remindAt = remindAt || undefined; t.reminded = false; return s; }
      }
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

  // Settings
  setSettings(patch: Partial<Settings>) {
    store.set((s) => { s.settings = { ...(s.settings || {}), ...patch }; return s; });
  },
  setGeminiKey(key: string) {
    store.set((s) => { s.settings = { ...(s.settings || {}), geminiApiKey: key.trim() || undefined }; return s; });
  },

  // Calendar events
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

  // Missed reminders
  dismissMissedReminder(id: string) {
    store.set((s) => { s.missedReminders = (s.missedReminders ?? []).filter((m) => m.id !== id); return s; });
  },
  clearMissedReminders() {
    store.set((s) => { s.missedReminders = []; return s; });
  },

  // Backup
  exportData(): string {
    return JSON.stringify({ ...store.get(), version: STATE_VERSION }, null, 2);
  },
  importData(json: string): { ok: boolean; error?: string } {
    try {
      const parsed = JSON.parse(json);
      if (!parsed || typeof parsed !== "object" || !parsed.days || !Array.isArray(parsed.habits)) {
        return { ok: false, error: "File doesn't look like a LIFE backup." };
      }
      state = sanitizeState(parsed);
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
  return store.get().settings ?? {};
}

// ============================================================================
// Notifications & reminders
// ============================================================================

function notify(title: string, body?: string) {
  if (typeof window === "undefined") return;
  const enabled = store.get().settings?.notificationsEnabled !== false;
  if (!enabled) return;
  if (Capacitor.isNativePlatform()) {
    LocalNotifications.schedule({
      notifications: [
        {
          title: title,
          body: body || "",
          id: new Date().getTime(),
          schedule: { at: new Date(Date.now() + 100) },
          actionTypeId: "",
          extra: null
        }
      ]
    }).catch(() => {});
    return;
  }
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    try { new Notification(title, { body, icon: "/icon-192.png", badge: "/icon-192.png", tag: title }); return; } catch {}
  }
  try { window.dispatchEvent(new CustomEvent("daily:in-app-alert", { detail: { title, body } })); } catch {}
}

const FRESH_WINDOW_MS = 2 * 60 * 1000;
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

export { nowIST };
