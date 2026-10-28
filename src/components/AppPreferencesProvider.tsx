"use client";
import { translateText } from "@/lib/i18n";


import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppLanguage, getDictionary, normalizeLanguage, setActiveLanguage, translateKey } from "@/lib/i18n";

type ThemeOption = "dark" | "light";

type AppPreferencesContextValue = {
  theme: ThemeOption;
  language: AppLanguage;
  hydrated: boolean;
  setTheme: (theme: ThemeOption) => void;
  setLanguage: (language: AppLanguage) => void;
  t: (key: string, fallback?: string) => string;
};

const STORAGE_KEYS = {
  theme: "closeflow_theme",
  language: "closeflow_language",
};

const AppPreferencesContext =
  createContext<AppPreferencesContextValue | null>(null);

export function AppPreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setThemeState] =
    useState<ThemeOption>("dark");

  const [language, setLanguageState] = useState<AppLanguage>("en");

  const [hydrated, setHydrated] =
    useState(false);
  const languageChangedByUser = useRef(false);

  useEffect(() => {
    document.title = language === "de"
      ? "CloseFlow | KI-gestütztes CRM"
      : "CloseFlow | AI-powered CRM";
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) {
      description.content = language === "de"
        ? "Ein übersichtliches KI-gestütztes CRM für moderne Vertriebsteams."
        : "A polished AI-powered CRM experience for modern revenue teams.";
    }
  }, [language]);

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

    const savedLanguage = normalizeLanguage(
      window.localStorage.getItem(STORAGE_KEYS.language),
    );
    setActiveLanguage(savedLanguage);
    setLanguageState(savedLanguage);
    document.documentElement.setAttribute("lang", savedLanguage);

    // The account profile is authoritative across devices. Local storage keeps
    // the selected language available before this request completes.
    void fetch("/api/profile", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const profile = (await response.json()) as { language?: unknown };
        if (languageChangedByUser.current) return;
        const profileLanguage = normalizeLanguage(profile.language);
        setActiveLanguage(profileLanguage);
        setLanguageState(profileLanguage);
        window.localStorage.setItem(STORAGE_KEYS.language, profileLanguage);
        document.documentElement.setAttribute("lang", profileLanguage);
      })
      .catch(() => undefined);

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

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    languageChangedByUser.current = true;
    setActiveLanguage(nextLanguage);
    setLanguageState(nextLanguage);
    document.documentElement.setAttribute("lang", nextLanguage);
    window.localStorage.setItem(STORAGE_KEYS.language, nextLanguage);
  }, []);

  const value =
    useMemo<AppPreferencesContextValue>(
      () => ({
        theme,
        language,
        hydrated,
        setTheme,
        setLanguage,
        t: (
          key: string,
          fallback?: string,
        ) =>
          translateKey(
            getDictionary(language),
            key,
            fallback,
          ),
      }),
      [hydrated, language, theme, setLanguage, setTheme],
    );

  return (
    <AppPreferencesContext.Provider
      value={value}
    >
      {children}
    </AppPreferencesContext.Provider>
  );
}

export function LocalizedContent({ children }: { children: React.ReactNode }) {
  const { language } = useAppPreferences();
  return <div key={language} className="contents">{children}</div>;
}

export const useAppPreferences = () => {
  const context = useContext(
    AppPreferencesContext,
  );

  if (!context) {
    throw new Error(
      translateText("useAppPreferences must be used within AppPreferencesProvider"),
    );
  }

  return context;
};
