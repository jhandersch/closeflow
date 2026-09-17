"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getDictionary, translateKey } from "@/lib/i18n";

type ThemeOption = "dark" | "light";

type AppPreferencesContextValue = {
  theme: ThemeOption;
  hydrated: boolean;
  setTheme: (theme: ThemeOption) => void;
  t: (key: string, fallback?: string) => string;
};

const STORAGE_KEYS = {
  theme: "closeflow_theme",
};

const dictionary = getDictionary("en");

const AppPreferencesContext =
  createContext<AppPreferencesContextValue | null>(null);

export function AppPreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setThemeState] =
    useState<ThemeOption>("dark");

  const [hydrated, setHydrated] =
    useState(false);

  useEffect(() => {
    const savedTheme =
      window.localStorage.getItem(
        STORAGE_KEYS.theme,
      ) as ThemeOption | null;

    if (
      savedTheme === "dark" ||
      savedTheme === "light"
    ) {
      setThemeState(savedTheme);
      document.documentElement.setAttribute(
        "data-theme",
        savedTheme,
      );
    } else {
      document.documentElement.setAttribute(
        "data-theme",
        "dark",
      );
    }

    document.documentElement.setAttribute(
      "lang",
      "en",
    );

    setHydrated(true);
  }, []);

  const setTheme = useCallback(
    (nextTheme: ThemeOption) => {
      setThemeState(nextTheme);

      document.documentElement.setAttribute(
        "data-theme",
        nextTheme,
      );

      window.localStorage.setItem(
        STORAGE_KEYS.theme,
        nextTheme,
      );
    },
    [],
  );

  const value =
    useMemo<AppPreferencesContextValue>(
      () => ({
        theme,
        hydrated,
        setTheme,
        t: (
          key: string,
          fallback?: string,
        ) =>
          translateKey(
            dictionary,
            key,
            fallback,
          ),
      }),
      [hydrated, theme, setTheme],
    );

  return (
    <AppPreferencesContext.Provider
      value={value}
    >
      {children}
    </AppPreferencesContext.Provider>
  );
}

export const useAppPreferences = () => {
  const context = useContext(
    AppPreferencesContext,
  );

  if (!context) {
    throw new Error(
      "useAppPreferences must be used within AppPreferencesProvider",
    );
  }

  return context;
};