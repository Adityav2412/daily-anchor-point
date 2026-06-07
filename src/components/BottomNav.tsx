import { Link, useLocation } from "@tanstack/react-router";

const items = [
  { to: "/", label: "Today", emoji: "🌿" },
  { to: "/habits", label: "Habits", emoji: "🔁" },
  { to: "/study", label: "Study", emoji: "📚" },
  { to: "/planner", label: "Time", emoji: "⏱" },
  { to: "/calendar", label: "Events", emoji: "📅" },
  { to: "/history", label: "Stats", emoji: "📈" },
] as const;

export function BottomNav() {
  const loc = useLocation();
  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] max-w-md animate-fade-up">
      <div className="rounded-full bg-foreground/95 backdrop-blur-xl px-1.5 py-1.5 flex items-center justify-between shadow-[0_20px_50px_-15px_rgba(0,0,0,0.35)]">
        {items.map((t) => {
          const active = loc.pathname === t.to;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`relative flex items-center gap-1.5 px-3 py-2.5 rounded-full transition-all duration-300 press ${
                active ? "bg-background text-foreground shadow-sm" : "text-background/60 hover:text-background"
              }`}
              aria-label={t.label}
            >
              <span className="text-[15px] leading-none">{t.emoji}</span>
              {active && <span className="text-[12px] font-semibold tracking-tight animate-slide-in">{t.label}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
