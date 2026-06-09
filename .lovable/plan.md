# Daily — Full Redesign & Fix Plan

Scope: visual overhaul + behavior cleanup across all tabs. No user data deleted (localStorage store preserved & migrated).

## 1. Design system (`src/styles.css`, `index.html`)
- Swap Fraunces → **Playfair Display** (Google Fonts) for `--font-display`. Keep Manrope for body.
- Dark (default): bg `#0A0A0A`, card `#1A1A1A`, accent amber `#F5A623`, text `#F5F5F2`.
- Light: bg `#F8F6F2`, card `#FFFFFF`, accent amber `#F5A623`.
- Card radius 20px+, soft shadows, generous spacing.
- Micro-animations: card tap scale, habit tick bounce + amber fill, tab slide.

## 2. Shell (`AppShell`, `BottomNav`)
- Keep theme toggle top-right (already there).
- Bottom nav: pill bar, icon + label always visible, active = amber pill background.
- Greeting moved into Today tab (not header).

## 3. Today tab (`routes/index.tsx`)
- Big greeting "Good Morning, Akshay 👋" (IST-based) + today's date.
- Encouraging dynamic message card ("2 habits done today 🌱", streak badges).
- Habit summary: circular progress (e.g. 1/2), tap to expand list.
- Tasks card (today only, with Today/Tomorrow toggle on add + optional reminder time).
- Win of day — single line input.
- Bad day button — subtle at bottom.
- Night setup card — only after 20:00 IST: "Plan tomorrow — 2 mins".

## 4. Habits tab (`routes/habits.tsx`)
- Per habit: name + ✓ tick + ✗ cross.
- Tick = mark done (bounce animation).
- Cross = popup → reason text → save as missed with reason.
- Auto carry-forward (already in store).

## 5. Study tab (`routes/study.tsx`)
- TOP: **TODAY'S PLAN** — from yesterday's "Plan for Tomorrow". Checkbox each item. Unchecked items roll over at midnight IST tagged "📌 Backlog".
- Remove studied Yes/No toggle, remove timer.
- Manual log: "What did you study?" + duration (h/m) → saved with IST date.
- Bottom: "Plan for Tomorrow" textarea (one item per line).

## 6. Time tab (`routes/planner.tsx`)
- Study only. Manual entry: date (default today) + topic + start + end → computes duration.
- History list "Jun 7 — Polity (2h 30m)".
- Weekly summary: total + most productive weekday. Simple per-day bar.

## 7. Stats tab (`routes/history.tsx`)
- Habits section: per day row → ✓ done / ✗ missed (with reason).
- Study section: per day → "Studied (1h 30m, Polity)" or "Not studied".
- Remove time-tracker block.
- **AI Insights**: Gemini fetch w/ `gemini-2.0-flash`, fallback `gemini-1.5-flash-latest`. Button "Get Akshay's weekly analysis", sends last 7 days habits+study JSON. Shows clear error if key missing or call fails.

## 8. Calendar tab (`routes/calendar.tsx`)
- Add event: name + date + note.
- List sorted by date. Days remaining badge ("tomorrow", "in 3 days", "today!").
- Color: red ≤3d, amber ≤7d, green >7d, gray "✓ Passed".

## 9. Reminders / notifications
- Remove "tap to copy URL" / install prompt banners (already suppressed; double-check `main.tsx`).
- Task reminder: optional time picker → schedules `Notification` at that time; if permission denied, fires in-app banner via existing `daily:in-app-alert` event.

## 10. Store (`src/lib/store.ts`)
- Add `events: {id,name,date,note}[]`.
- Add `studyLogs: {date, topic, minutes}[]` (replace/augment current study time entries).
- Add backlog flag to plan items.
- Migration leaves existing keys intact.

## Technical notes
- Gemini key: read `import.meta.env.VITE_GEMINI_API_KEY`. If missing, show inline error in AI Insights card (no silent fail). User must set in Vercel env.
- All dates via existing `src/lib/ist.ts`.
- Keep TanStack Router file routes; no new routes needed.

## Out of scope
- No backend/Cloud (all localStorage, per current app).
- No data migration loss.

Confirm to proceed and I'll implement in one pass.
