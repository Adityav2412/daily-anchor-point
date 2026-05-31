import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "daily-theme";
type Theme = "dark" | "light";

function getSavedTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "light") return "light";
  return "dark";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => getSavedTheme());

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggle };
}

export function getThemeScript(): string {
  return `(function(){var t=localStorage.getItem('${STORAGE_KEY}');if(t==='light')document.documentElement.classList.remove('dark');else document.documentElement.classList.add('dark');})();`;
}
