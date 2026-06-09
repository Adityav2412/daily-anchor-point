import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "daily-theme";
type Theme = "dark" | "light";

function getSavedTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "dark") return "dark";
  return "light"; // beige is default
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => getSavedTheme());

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggle };
}
