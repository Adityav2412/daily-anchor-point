// Curated rotating English motivational quotes — picked deterministically per IST day.
export const ENGLISH_QUOTES: string[] = [
  "Only those who dream with all their heart reach the destination.",
  "Those who keep trying never truly lose.",
  "Every day is a new day — a fresh start.",
  "Be patient — good days will surely come.",
  "Small steps still take you to the destination.",
  "Trust yourself — you can do this.",
  "There is no substitute for hard work.",
  "Make today better than yesterday.",
  "Real dreams are the ones that don't let you sleep.",
  "Don't stop — just one more step.",
  "Every failure is a new lesson.",
  "The one who fights is the one who wins.",
  "Your studies are your real strength.",
  "A little, every day, becomes a lot.",
  "If your mind wanders, gently bring it back — it's okay.",
  "Promise yourself: today, I will finish one thing.",
  "Sit calm, then work with full strength.",
  "Discipline is the greatest freedom.",
  "Every page takes you closer to the goal.",
  "Full sleep, calm mind, deep study.",
  "What you sow today, you reap tomorrow.",
  "Difficulties come, and difficulties pass.",
  "Don't lose courage — the path will appear.",
  "One hour of practice a day becomes a mountain in a year.",
  "Don't compare yourself to others — only to who you were yesterday.",
  "Take a deep breath, and begin.",
  "One small win each day is enough.",
  "Walk slowly, but don't stop.",
  "Your time will come — just stay ready.",
  "What you study today will help you tomorrow.",
];

export function dailyQuote(dateKey: string): string {
  const n = dateKey.replace(/-/g, "").split("").reduce((a, c) => a + (parseInt(c, 10) || 0), 0);
  return ENGLISH_QUOTES[n % ENGLISH_QUOTES.length];
}

// Backwards-compat exports (old names still imported elsewhere).
export const HINDI_QUOTES = ENGLISH_QUOTES;
export const dailyHindiQuote = dailyQuote;
