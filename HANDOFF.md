# LIFE — Developer Handoff

**App:** LIFE — Personal Life Companion
**Stack:** React 18 + Vite 5 + TypeScript 5 + Tailwind v3 + TanStack Router
**Runtime:** 100% client-side PWA. No backend. All data in `localStorage`.
**Timezone:** IST (UTC+5:30) for every date calculation.
**Official Start Date:** `2026-06-15` (Day 1 of the LIFE journey).

---

## 1. App Architecture

### Routing (TanStack Router, file-based)
Seven tabs, no other routes:
```
/          → Today        (src/routes/index.tsx)
/habits    → Habits       (src/routes/habits.tsx)
/study     → Study        (src/routes/study.tsx)
/tasks     → Tasks        (src/routes/tasks.tsx)
/calendar  → Calendar     (src/routes/calendar.tsx)
/journal   → Journal + Memory Jar (src/routes/journal.tsx)
/timeline  → Timeline + Monthly Summary + AI Reflections (src/routes/timeline.tsx)
```
`/history`, `/planner`, `/stats` are removed. Legacy `/history` redirects to `/timeline`.

### Shell & layout
- `src/components/AppShell.tsx` — header (date, theme toggle, offline pill, missed-reminder cards) + main + `BottomNav`.
- `src/components/BottomNav.tsx` — 7-tab pill nav.
- `src/components/Companion.tsx` — plant SVG (stage-driven) + daily message.

### State layer
- `src/lib/store.ts` — single source of truth. Tiny custom store with:
  - `store.get()`, `store.set(updater)`, `store.subscribe(fn)`
  - `useStore(selector)` via `useSyncExternalStore`
  - `actions.*` — all mutations
- `src/lib/ist.ts` — every date/time helper (IST math, Monday-first week, midnight ms).
- `src/lib/garden.ts` — growth stages, daily message, monthly summary.
- `src/lib/timeline.ts` — merged feed builder.

### Lifecycle
On `AppShell` mount: `startMidnightWatcher()` (polls every 20s) + `recomputeGarden()`. The watcher promotes tomorrow→today, materialises `upcoming` tasks whose `dueDate` equals today, fires reminders, and queues missed ones.

### PWA
- `public/manifest.webmanifest` — name `LIFE`, sage icon set (`/icon-192.png`, `/icon-512.png`, maskable).
- `public/sw.js` — basic offline shell.
- `index.html` — `<title>LIFE — Personal Life Companion</title>`.

---

## 2. Storage Structure

Single localStorage key: **`life_state_v1`** (JSON). Cross-tab sync via the native `storage` event.

```ts
State {
  days: Record<DateKeyISO, DayData>
  habits: Habit[]
  archivedHabits: Habit[]
  events: CalendarEvent[]
  memoryJar: MemoryItem[]
  garden: { stage: number; lastGrowKey?: string; lastMsgKey?: string; lastMsgIdx?: number }
  firedReminders: Record<string, number>     // id → fired timestamp (de-dup)
  missedReminders: MissedReminder[]          // visible in AppShell until dismissed
  theme?: "light" | "dark"
}
```

- All keys (e.g. `2026-06-15`) are computed via `istDateKey()`.
- Migration is additive: `backfillDay()` fills any missing fields with defaults; nothing is dropped.
- No data is generated before `LIFE_START_KEY = "2026-06-15"`. Garden, timeline, monthly summary, and study stats all skip earlier keys.

---

## 3. Data Models

```ts
type Mood   = "difficult" | "okay" | "good" | "great"
type Energy = "low" | "medium" | "high"

DayData {
  mood?: Mood
  energy?: Energy
  focus?: string                          // "Aaj Ka Focus" (resets at IST midnight)
  habits: Record<HabitId, { done: boolean; missedReason?: string }>
  study: {
    sessions: StudySession[]              // [{ subject, durationMin, feeling? }]
    timeSessions?: number                 // legacy total minutes, kept in sync
    win?: string                          // also pushed into memoryJar
    todayPlan?: PlanItem[]
    tomorrowPlan?: PlanItem[]
  }
  tasksToday: Task[]
  tasksTomorrow: Task[]
  upcoming: Task[]                        // promoted into tasksToday when dueDate === today
  journal?: { feeling?; wentWell?; difficult?; tomorrow? }
  surprises?: string[]
}

Habit {
  id; name; icon (emoji); category: "Mental" | "Physical" | "Custom";
  createdAt; archivedAt?
}

Task {
  id; title; category?; priority: "low"|"med"|"high";
  done; dueDate?: DateKey; reminderOffsetMin?: number;  // null = at start of day
  createdAt
}

CalendarEvent {
  id; name; date: DateKey; category?; note?;
  reminderOffsetMin?: number              // minutes before IST midnight of `date`
}

MemoryItem      { id; text; dateKey; createdAt }
MissedReminder  { id; title; body?; scheduledAt: ISO }
```

---

## 4. Reminder Logic

Implemented in `store.ts` (`checkReminders`, `fireOrMiss`) and surfaced in `AppShell.tsx`.

1. **Sources scanned each tick (20s):**
   - `days[today].tasksToday` with `reminderOffsetMin`
   - `events` with `date >= today` and `reminderOffsetMin`
2. **Trigger time:**
   - Tasks: `istMidnightMs(today) + (offset || 0)` (offset measured from start of day; "At time" uses task's stored time if present).
   - Events: `istMidnightMs(event.date) - reminderOffsetMin`.
3. **`fireOrMiss(id, title, body, scheduledMs)`:**
   - If `firedReminders[id]` exists → skip (de-dup).
   - If `now - scheduledMs <= 2 min` → `notify()` (browser Notification, icon `/icon-192.png`) + in-app toast.
   - If `2 min < now - scheduledMs <= 7 days` → push to `missedReminders` queue.
   - Else → ignore (stale).
   - Mark `firedReminders[id] = now`.
4. **Missed-reminder UI:** top of `AppShell` shows up to 3 cards with relative time ("20 minutes ago"); `actions.dismissMissedReminder(id)` or `clearMissedReminders()`.
5. **Permission:** requested lazily on first user-triggered reminder save.

---

## 5. Garden Logic (`src/lib/garden.ts`)

- Stages (monotonic, never decreases):
  `🌱 → 🌿 → 🌵 → 🍀 → 🌸 → 🌺 → 🌻 → 🌳` (MAX_STAGE = 7)
- **A day "counts" if** any of: mood, energy, focus, any habit done, study minutes > 0, any completed task, a win, or any journal field.
- `recomputeGarden()` counts unique active days `>= LIFE_START_KEY`. `stage = min(MAX, floor(loggedDays / 5))`.
- **Daily message:** deterministic index from `dateKey` digit-sum into a 10-line supportive pool, cached in `garden.lastMsgKey/lastMsgIdx` so it stays stable all day.
- **Monthly summary** (current IST month, skipping pre-launch days):
  `{ goodDays, studyHours, wins, growth, label }`.

---

## 6. Timeline Logic (`src/lib/timeline.ts`)

`buildTimeline(state) → Record<DateKey, TimelineItem[]>` merges, per date key (skipping `< LIFE_START_KEY`):
- mood, energy
- completed habits (resolved against `habits ∪ archivedHabits`)
- study sessions (aggregated minutes + subjects)
- completed tasks
- daily win
- journal snippet (joined non-empty fields)
- calendar events (by `event.date`)

`TimelineItem { id, kind, dateKey, emoji, text, detail? }`. The route renders grouped sections (desc by date) with filter chips (All / Mood / Habits / Study / Tasks / Journal / Events / Wins) and a free-text search.

**Empty states (`src/routes/timeline.tsx`):**
- `today < "2026-06-15"` → "Your LIFE journey begins on 15 June 2026."
- Else if empty → "Your timeline is ready."

---

## 7. AI Reflection Flow

Located in Timeline route.

- Button: **"Reflect on my week"**.
- Provider: Google Gemini direct from the client.
  - Model: `gemini-2.0-flash`, fallback `gemini-1.5-flash-latest`.
  - Key: `import.meta.env.VITE_GEMINI_API_KEY` (publishable).
- Input: last 7 days of timeline items serialised as compact JSON.
- Prompt rules: gentle, non-judgemental, 3–5 short observations; **no criticism, no comparison, no metrics shaming**.
- Disabled when `!navigator.onLine` or key missing (shown with a tooltip / inline note).
- Output rendered as a calm bulleted card; not persisted (regeneratable).

---

## 8. Offline Behaviour

- `AppShell` listens to `online`/`offline` and shows the "Offline mode active" pill.
- All reads/writes are local — full functionality offline.
- AI Reflections is the only feature that gates on connectivity.
- Service worker (`public/sw.js`) caches the app shell for cold offline launches.

---

## 9. Conventions

- **Never** hardcode colour utilities (`text-white`, `bg-[#...]`). Use semantic tokens from `src/styles.css` (sage palette, warm off-white surfaces).
- **Monday-first** weeks everywhere (`currentWeekKeysIST()`). Habit dots render Mon→Sun.
- **No streak language**, no red error tones for "missed" — use warm amber.
- **No demo data, ever.** All seeding paths were removed.

---

## 10. Known Limitations / Future Recommendations

### High-value next steps
1. **Server-side push reminders.** Current reminders need the PWA to be open within ~20s of the trigger. A small push service (e.g., Web Push + a tiny worker) would make reminders survive app-closed states beyond the 7-day missed window.
2. **IndexedDB migration with schema versioning.** `localStorage` is bounded (~5 MB) and synchronous. As Memory Jar and study sessions grow over years, move to IDB via `idb-keyval` or Dexie with explicit migrations.
3. **Export / import / backup.**
   - One-tap JSON export to file.
   - Optional encrypted cloud backup (Lovable Cloud) — opt-in, not required.
4. **Weekly summary card** (mirroring monthly), Monday-reset, surfaced on Timeline.
5. **Yearly "Year in LIFE" recap** generated at year-end from timeline + memory jar.

### UX polish
6. **Habit heatmap** (GitHub-style) on the Habits page once enough history exists.
7. **Mood/energy trend sparkline** in the monthly card — single line, no axes, calm aesthetic.
8. **Memory Jar collections / tags** so wins can be filtered ("travel", "family", "career").
9. **Calendar week-view** in addition to month grid.
10. **Smart focus suggestions** — pull "Aaj Ka Focus" suggestions from recent unfinished high-priority tasks.

### Reliability / engineering
11. **Unit tests** for `garden.ts`, `timeline.ts`, and reminder math (Vitest).
12. **State schema version field** (`state.version`) + forward-only migrations.
13. **Telemetry-free error capture** is already present (`src/lib/error-capture.ts`); add an in-app "report issue" affordance.
14. **A11y pass** — focus rings, ARIA on emoji-only buttons, prefers-reduced-motion respect for the companion animation.
15. **Settings tab** (8th tab or modal): rename, change start date, wipe data, manage notifications, export JSON.

### AI extensions (opt-in)
16. **Monthly reflection** in addition to weekly.
17. **"Surprise insight"** — pick a random past week and surface a single observation.
18. **Tone selector** for reflections (gentle / matter-of-fact / playful).

---

*Document generated 13 June 2026. Update alongside any change to `store.ts`, `garden.ts`, `timeline.ts`, or the reminder pipeline.*
