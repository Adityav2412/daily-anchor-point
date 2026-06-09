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
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1rem)] max-w-md animate-fade-up">
      <div className="rounded-full bg-card/95 backdrop-blur-xl border border-border px-1.5 py-1.5 flex items-center justify-between shadow-[0_20px_50px_-15px_rgba(0,0,0,0.45)]">
        {items.map((t) => {
          const active = loc.pathname === t.to;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`relative flex flex-col items-center gap-0.5 flex-1 py-2 rounded-full transition-all duration-300 press ${
                active ? "bg-amber text-[#0A0A0A] shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label={t.label}
            >
              <span className="text-[14px] leading-none">{t.emoji}</span>
              <span className="text-[9px] font-semibold tracking-wide uppercase">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
