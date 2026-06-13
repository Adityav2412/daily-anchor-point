import { Link, useLocation } from "@tanstack/react-router";
import { Sun, Leaf, BookOpen, CheckSquare, Calendar, NotebookPen, Clock } from "lucide-react";

const items = [
  { to: "/", label: "Today", Icon: Sun },
  { to: "/habits", label: "Habits", Icon: Leaf },
  { to: "/study", label: "Study", Icon: BookOpen },
  { to: "/tasks", label: "Tasks", Icon: CheckSquare },
  { to: "/calendar", label: "Calendar", Icon: Calendar },
  { to: "/journal", label: "Journal", Icon: NotebookPen },
  { to: "/timeline", label: "Timeline", Icon: Clock },
] as const;

export function BottomNav() {
  const loc = useLocation();
  return (
    <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-0.75rem)] max-w-md animate-fade-up">
      <div className="rounded-full bg-card/95 backdrop-blur-xl px-1 py-1 flex items-center justify-between shadow-[0_10px_30px_-12px_rgba(60,60,55,0.25)]">
        {items.map((t) => {
          const active = loc.pathname === t.to;
          const Icon = t.Icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`relative flex flex-col items-center justify-center flex-1 py-2 rounded-full transition-all duration-300 press ${
                active ? "bg-sage text-[#1A1C1A]" : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label={t.label}
            >
              <Icon size={16} strokeWidth={2} />
              {active && <span className="text-[8.5px] font-semibold tracking-wider uppercase mt-0.5">{t.label}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
