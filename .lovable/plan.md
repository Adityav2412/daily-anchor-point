## Goal
Make the app gentler and more useful for Akshay. Fix carry-forward & history bugs, add Morning Intention / Tough Day / Pomodoro / Night Setup / Weekly Report, and simplify Plan tab — all within existing tabs, fonts, colors, and layout.

## Bug fixes
1. **IST date consistency** — audit `src/lib/store.ts` and `src/lib/ist.ts`. Ensure every day-key write uses `istDateKey()` (no `new Date().toISOString().slice(0,10)` UTC slips). Backfill any legacy entries on load.
2. **Stats historical data** — `src/routes/history.tsx` filters by `startKey`. Make sure `dataStartKey` is set on first ever open (not reset on new sessions), and that day records persist (already using zustand `persist`). Verify entries from prior days surface in Study/Energy sections.
3. **Daily log clarity** — in History "Daily log" expanded view, list each habit with ✓ (done) / ✗ missed (reason if any) / ○ not logged, instead of mixing ✓/○.
4. **Plan carry-forward** — when Study tab loads on day N, if `days[N].study.tomorrowPlan` is empty AND `days[N-1].study.tomorrowPlan` exists, surface that as **"Today's plan"** banner at top of Study tab (read-only, with a "Done with this" dismiss). Uses IST yesterday key.

## New features (fit into existing tabs)

### Today tab (`src/routes/index.tsx`)
- **Morning Intention card** — shown only if `today.intention` not yet set. Three inline inputs (study goal text, energy 1–5 pills, priority habit select from `habits`). "Good morning, Akshay. Set your intention." Saves to `today.intention = { goal, energy, habitId, setAt }`. Card hides after save; replaced by a tiny one-line summary chip ("Intention set ✓ — view") that expands.
- **Tough day button** — small subtle text-button under reflection. Opens inline gentle card: message + optional "What happened?" textarea. Saves to `today.toughDay = { note, at }`. No streak language anywhere.
- **Night Setup card** — appears only after 20:00 IST AND if not yet filled. Three fields: up to 3 tomorrow tasks (add to tomorrow's `tasksToday`), study plan text (writes to today's `study.tomorrowPlan`), sleep time intention (HH:MM). Label "Wind down, Akshay. Plan tomorrow in 2 minutes."

### Study tab (`src/routes/study.tsx`)
- **Today's plan banner** at top when carried forward (see bug #4).
- **Pomodoro card** — 25:00 countdown, Start / Pause / Reset. On finish: toast "Take a 5 min break." (sonner) + soft beep optional. Local state only.

### Plan tab (`src/routes/planner.tsx`) — full rewrite, simpler
- Remove existing block system entirely.
- **Time log entry**: activity text + start time + end time → appended to `today.timeLog: { activity, start, end }[]`.
- **End-of-day summary** — grouped totals per activity (hh mm).
- **Weekly view** — simple text list: for each of last 7 IST days, list activity → hours. No charts.

### Stats tab (`src/routes/history.tsx`)
- **Weekly Report card** at top, visible only on Sunday IST. Shows: total study hours this week, habits completion rate, average energy, "This week's win" (most recent non-empty `study.win` from week).
- **Daily log** entries updated per bug #3.
- Remove "Symptom log" — confirmed none exists currently, nothing to remove.

## Store changes (`src/lib/store.ts`)
Extend `DayState`:
```ts
intention?: { goal: string; energy: number; habitId?: string; setAt: string }
toughDay?: { note?: string; at: string }
nightSetup?: { sleepIntention?: string; at: string }
timeLog: { activity: string; start: string; end: string }[]   // default []
```
Add actions: `setIntention`, `logToughDay`, `setNightSetup`, `addTimeLog`, `removeTimeLog`, `carryPlanForward()` helper (reads yesterday's `tomorrowPlan`).
Keep all existing actions/types unchanged for back-compat (older persisted state hydrates with sensible defaults).

## Tone pass
Grep for negative words ("broken", "failed", "missed streak") — none exist, but ensure new copy follows gentle voice (no streaks, no red error styling for missed habits).

## Files touched
- `src/lib/store.ts` (extend types + actions)
- `src/lib/ist.ts` (add `istYesterdayKey`, `istNow` helpers if missing)
- `src/routes/index.tsx` (Morning Intention, Tough Day, Night Setup)
- `src/routes/study.tsx` (carry-forward banner, Pomodoro)
- `src/routes/planner.tsx` (full rewrite to simple time log)
- `src/routes/history.tsx` (Weekly Report on Sundays, clearer daily log)

No UI tokens, fonts, or layout system changes. No new tabs. No new dependencies.
