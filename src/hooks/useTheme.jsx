import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { STORAGE_KEYS } from "../utils/constants";
import { loadJSON, saveJSON, removeKey } from "../utils/storage";

const ThemeContext = createContext(null);

function getSystemTheme() {
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(() => {
    // Remove legacy v1 key so users are reset to system default
    removeKey("taskflow.theme.v1");
    const stored = loadJSON(STORAGE_KEYS.THEME, "system");
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
    return "system";
  });

  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  // Subscribe to OS color scheme changes when preference is "system"
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

    setSystemTheme(mediaQuery.matches ? "dark" : "light");
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const theme = preference === "system" ? systemTheme : preference;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        "content",
        theme === "dark" ? "#080806" : "#f8f3e7"
      );
    }

    saveJSON(STORAGE_KEYS.THEME, preference);
  }, [theme, preference]);

  const value = useMemo(
    () => ({
      preference,
      theme,
      setPreference,
    }),
    [preference, theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
