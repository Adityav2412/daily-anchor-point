# LIFE — Personal Life Companion Redesign

A staged rebuild of the current app. No new project, no backend changes; existing localStorage data preserved via a backwards-compatible migration. Vercel deploy, PWA, and Android install path stay intact.

## What changes vs. what stays

**Stays:** localStorage store, IST utilities, existing habits / study sessions / tasks / events / intention / win fields, Vercel config, `public/manifest.webmanifest`, `public/sw.js`, install metadata.

**Removed entirely:** the old `Time` tab (`/planner`) and the `Stats` / `History` tab (`/history`). They had separate AI Reflections and analytics blocks — all of that now lives inside Timeline. No `/planner`, `/history`, `/stats`, or `/analytics` routes remain.

**Final navigation (the only 7 tabs):** `Today · Habits · Study · Tasks · Calendar · Journal · Timeline`. Timeline is the single place for life history, monthly summary, AI reflections, search, and filters.

**Changes:** visual system, navigation rebuilt to the 7 tabs above, Today layout, replacement of streak language with a "garden" growth model, addition of mood/energy/journal/memory jar/timeline + AI reflections inside Timeline.

## Design system

- Palette (CSS tokens in `src/styles.css`):
  - Background `#F5F1EA` (warm off-white), card `#FFFFFF` with soft shadow
  - Primary sage `#9CB89F`, sage-deep `#6F8F73`
  - Accent lavender `#C8BBDD`
  - Success `#A8C9A0`, warning amber `#E8B26B`
  - Text `#3A3A37`, muted `#7A7770`
  - Dark mode kept as toggle: bg `#1A1C1A`, card `#23262A`, same accents tuned
- Typography: keep Playfair Display headings, DM Sans body; looser line-height.
- Cards: 24px radius, very soft shadow `0 6px 18px rgba(60,60,55,0.06)`. No harsh borders.
- Remove all guilt / streak language; replace red error tones with warm amber for "missed".

## Navigation (7 tabs)

Bottom nav pills: `Today · Habits · Study · Tasks · Calendar · Journal · Timeline`. On narrow phones, icons only with a small label under the active tab.

## Data model additions (`src/lib/store.ts`)

Backwards-compatible. `backfillDay` fills new fields with defaults; nothing existing is dropped.

```
DayData += {
  mood?: "difficult" | "okay" | "good" | "great"
  energy?: "low" | "medium" | "high"
  focus?: string                                       // "Aaj Ka Focus"
  journal?: { feeling?; wentWell?; difficult?; tomorrow? }
  surprises?: string[]
}

State += {
  memoryJar: { id; text; dateKey; createdAt }[]
  garden: { stage: number; lastGrowKey?: string; lastMsgKey?: string; lastMsgIdx?: number }
  archivedHabits: Habit[]
}
```

Garden stage = floor(uniqueLoggedDays / 5), capped at the emoji list length. Stage never decreases.

## Tab specs

### Today (priority order, top → bottom)
1. **Greeting card** — "Good Morning, Akshay" + IST date.
2. **Aaj Ka Focus** — prominent card directly under greeting. Single editable line (default placeholder: "What's one thing for today?"). Examples surfaced as quick chips: *Take care of myself · Finish one important task · Go for a walk · Study Polity 30 min*. Stored per `dateKey` in `DayData.focus`; auto-resets at midnight IST (no carry-over). Always-on edit, tap to change. This sits **above** all stats — stats are secondary.
3. **LIFE Companion** — plant SVG that swaps by garden stage (🌱 → 🌿 → 🌸 → 🌳). Below the plant, one short **supportive message of the day** (one per day, subtle, not chat-like). Pool:
   - "Nice to see you today."
   - "One step at a time."
   - "Thanks for checking in."
   - "Rough day? Keep it simple."
   - "Small progress still counts."
   Message chosen deterministically per `dateKey` and cached in `garden.lastMsgKey/lastMsgIdx`. No reply UI, no notification — just a quiet line under the plant.
4. **Mood** strip — 4 emoji buttons, instant save.
5. **Energy** strip — Low / Medium / High pills, instant save.
6. **Daily snapshot** (2-col grid, compact) — Habits `x/y`, Study `Hh Mm`, Tasks remaining, Upcoming event countdown.
7. **Win of the day** — single-line input → autosaves into `memoryJar`.
8. **Bad day mode** — subtle button → sheet asking only mood + optional note, shows gentle confirmation.

Remove streak counter from Today.

### Habits
- Active habit rows: emoji-icon, name, ✅ / ❌, 7-day dot strip.
- Add/edit dialog: name, emoji picker, category (Mental / Physical / Custom).
- Archive / restore with history preserved.
- Miss → quick reasons grid; "Other" opens text input.

### Study
- Today's plan checklist (from yesterday's tomorrow plan, max 3 carry-forward; older auto-archived).
- Log session: subject (datalist), hours, minutes, optional feeling emoji.
- Today total summary.
- Tomorrow's plan: editable, reorderable checklist.

### Tasks
- Tabs: Today / Tomorrow / Upcoming.
- Form: title, category chip, priority, due date, reminder offset (At time / 15m / 1h / 1d).
- Notifications via browser API; in-app banner fallback.
- Tomorrow promotes to Today at midnight IST.

### Calendar
- Month grid + upcoming list. Tap day → see/add events.
- Form: title, date, category, note, reminder offset (Day / 1d / 3d / 1w before).
- Past events stay muted "passed". Never auto-delete.

### Journal
- Today's reflection: 4 optional textareas, autosave on blur.
- Previous days list, editable/deletable.
- **Memory Jar** section:
  - Chip list of every win with edit/delete.
  - **"Surprise Me"** button → picks a random past win and shows a small card:
    ```
    🏆
    "Called a friend"
    12 April
    ```
  - Tap again to draw another. Disabled when jar is empty.

### Timeline
- **Monthly summary card** pinned at the very top — calm, minimal, single card:
  ```
  This Month
  🙂 Good Mood Days: 12
  📚 Study Time: 18h
  🏆 Wins Collected: 22
  🌱 Garden Growth: +2 stages
  ```
  Computed from current IST calendar month. No charts, no extra detail.
- **AI Reflections** card below the summary: button "Reflect on my week" → Gemini `gemini-2.0-flash` (fallback `gemini-1.5-flash-latest`) using `VITE_GEMINI_API_KEY`. Prompt forbids criticism / comparison; asks for 3-5 gentle observations. Disabled offline / shows clear error if key missing.
- Chronological feed grouped by date (desc): mood, energy, wins, habit completions, study sessions, completed tasks, journal snippets, events.
- Search input + filter chips (All / Mood / Habits / Study / Tasks / Journal / Events / Wins).

## Offline + PWA

- Keep `public/sw.js` and manifest unchanged.
- Header shows a small "Offline Mode Active" pill when `navigator.onLine === false`.
- AI Reflections disabled offline with tooltip "Needs internet".

## Migration

- New keys (`memoryJar`, `garden`, `archivedHabits`, `DayData.focus`) initialized empty if absent.
- Existing days unchanged.
- Old wins backfilled into Memory Jar on first load.
- `/history` redirects to `/timeline`.

## Files

**Edit:** `src/styles.css`, `src/components/BottomNav.tsx`, `src/components/AppShell.tsx`, `src/lib/store.ts`, `src/routes/index.tsx`, `src/routes/habits.tsx`, `src/routes/study.tsx`, `src/routes/calendar.tsx`, `src/components/illustrations.tsx`, route tree.

**Create:**
- `src/routes/tasks.tsx`
- `src/routes/journal.tsx`
- `src/routes/timeline.tsx`
- `src/lib/garden.ts` (stage logic, daily message picker, surprise picker)
- `src/lib/timeline.ts` (data merger + monthly summary)
- `src/components/Companion.tsx` (animated plant + daily message)

## Simplification rule

If any screen starts to feel crowded, drop information rather than add density. Calm > complete. The app should feel welcoming, not data-heavy.

## Out of scope (unless asked)

- IndexedDB migration (localStorage already works offline).
- Push notification server.
- Native Android packaging changes.

## Execution order

1. Tokens + nav + AppShell + Companion + migration.
2. Today redesign (Aaj Ka Focus, companion message, mood/energy/snapshot/win/bad-day).
3. Tasks route + categories/reminder offsets.
4. Habits archive + categories + emoji.
5. Study plan rules.
6. Calendar month grid + reminders.
7. Journal + Memory Jar (with Surprise Me).
8. Timeline + monthly summary + AI Reflections.
9. Offline pill, polish, redirect `/history` → `/timeline`.
