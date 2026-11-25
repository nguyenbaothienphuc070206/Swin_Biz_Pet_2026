"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Sun, Moon, Laptop } from "lucide-react";

export type ThemeMode = "light" | "dark" | "system";

export function ThemeToggle({
  variant = "icon",
  className = "",
}: {
  variant?: "icon" | "select" | "buttons" | "text";
  className?: string;
}) {
  const locale = useLocale();
  const isEn = locale === "en";
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [mounted, setMounted] = useState(false);

  const applyTheme = (mode: ThemeMode) => {
    const isDark =
      mode === "dark" ||
      (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("pawcare-theme") as ThemeMode | null;
    if (saved === "light" || saved === "dark" || saved === "system") {
      setTheme(saved);
      applyTheme(saved);
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
    }
  }, []);

  const changeTheme = (newMode: ThemeMode) => {
    setTheme(newMode);
    localStorage.setItem("pawcare-theme", newMode);
    applyTheme(newMode);
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    changeTheme(next);
  };

  if (!mounted) {
    if (variant === "text") {
      return (
        <button
          type="button"
          disabled
          className={`inline-flex min-h-9 items-center rounded-full border border-border bg-card px-2.5 sm:px-3 text-xs font-semibold text-muted-foreground whitespace-nowrap ${className}`}
        >
          <span className="hidden sm:inline">{isEn ? "Theme:\u00a0" : "Giao diện:\u00a0"}</span>
          <span>{isEn ? "Light" : "Sáng"}</span>
        </button>
      );
    }
    return (
      <button
        type="button"
        aria-label="Toggle theme"
        className={`grid size-9 place-items-center rounded-full border border-slate-300 dark:border-slate-700 bg-card text-muted-foreground shadow-xs ${className}`}
      >
        <Sun className="size-4" />
      </button>
    );
  }

  if (variant === "text") {
    const modeWord =
      theme === "dark"
        ? isEn ? "Dark" : "Tối"
        : isEn ? "Light" : "Sáng";
    return (
      <button
        type="button"
        onClick={toggleTheme}
        title={
          theme === "dark"
            ? isEn ? "Switch to Light theme" : "Chuyển sang giao diện sáng"
            : isEn ? "Switch to Dark theme" : "Chuyển sang giao diện tối"
        }
        className={`inline-flex min-h-9 items-center rounded-full border border-border bg-card px-2.5 sm:px-3 text-xs font-semibold text-foreground hover:bg-secondary transition cursor-pointer whitespace-nowrap ${className}`}
      >
        <span className="hidden sm:inline">{isEn ? "Theme:\u00a0" : "Giao diện:\u00a0"}</span>
        <span>{modeWord}</span>
      </button>
    );
  }

  if (variant === "buttons") {
    return (
      <div className={`grid grid-cols-3 gap-2 rounded-2xl border border-slate-300 dark:border-slate-700 bg-card p-1.5 shadow-xs ${className}`}>
        <button
          type="button"
          onClick={() => changeTheme("light")}
          className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold transition cursor-pointer border ${
            theme === "light"
              ? "bg-primary text-primary-foreground border-primary shadow-xs"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Sun className="size-3.5 text-amber-500 shrink-0" />
          <span>Sáng (Light)</span>
        </button>

        <button
          type="button"
          onClick={() => changeTheme("dark")}
          className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold transition cursor-pointer border ${
            theme === "dark"
              ? "bg-primary text-primary-foreground border-primary shadow-xs"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Moon className="size-3.5 text-blue-400 shrink-0" />
          <span>Tối (Dark)</span>
        </button>

        <button
          type="button"
          onClick={() => changeTheme("system")}
          className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold transition cursor-pointer border ${
            theme === "system"
              ? "bg-primary text-primary-foreground border-primary shadow-xs"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Laptop className="size-3.5 text-muted-foreground shrink-0" />
          <span>Hệ thống</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={theme === "dark" ? "Chuyển sang giao diện Sáng" : "Chuyển sang giao diện Tối (Dark Theme)"}
      aria-label={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
      className={`grid size-9 place-items-center rounded-full border border-slate-300 dark:border-slate-700 bg-card text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-primary shadow-xs transition-all cursor-pointer ${className}`}
    >
      {theme === "dark" ? (
        <Sun className="size-4 text-amber-400 transition-transform rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="size-4 text-slate-700 dark:text-slate-200 transition-transform -rotate-12 hover:rotate-0" />
      )}
    </button>
  );
}
