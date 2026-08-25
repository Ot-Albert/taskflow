import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEYS } from "../utils/constants";
import { loadJSON, saveJSON } from "../utils/storage";

// Theme is applied as a data-theme attribute on <html> so CSS variables can
// switch. We default to the OS preference on first visit.
function getInitialTheme() {
  const stored = loadJSON(STORAGE_KEYS.THEME, null);
  if (stored === "light" || stored === "dark") return stored;
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
}

export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    saveJSON(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggleTheme };
}
