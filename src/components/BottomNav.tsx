import { Link, useLocation } from "@tanstack/react-router";
import { Home, BookOpen, ListChecks, Clock, BarChart3 } from "lucide-react";

const items = [
  { to: "/", label: "Today", icon: Home },
  { to: "/habits", label: "Habits", icon: ListChecks },
  { to: "/study", label: "Study", icon: BookOpen },
  { to: "/planner", label: "Plan", icon: Clock },
  { to: "/history", label: "History", icon: BarChart3 },
] as const;

export function BottomNav() {
  const loc = useLocation();
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(560px,calc(100%-2rem))]">
      <nav className="flex items-center justify-between gap-1 rounded-full bg-primary px-2 py-2 shadow-2xl">
        {items.map(({ to, label, icon: Icon }) => {
          const active = loc.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-2 py-2 text-[11px] font-medium transition-colors ${
                active ? "bg-white text-primary" : "text-white/70 hover:text-white"
              }`}
            >
              <Icon size={18} strokeWidth={2} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
