"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppLanguage, getDictionary, translateKey } from "@/lib/i18n";
type ThemeOption = "dark" | "light";
type AppPreferencesContextValue = {
    language: AppLanguage;
    theme: ThemeOption;
    hydrated: boolean;
    setLanguage: (language: AppLanguage) => void;
    setTheme: (theme: ThemeOption) => void;
    t: (key: string, fallback?: string) => string;
};
const STORAGE_KEYS = {
    theme: "closeflow_theme",
    language: "closeflow_language",
};
const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(null);
export function AppPreferencesProvider({ children }: {
    children: React.ReactNode;
}) {
    const [language, setLanguageState] = useState<AppLanguage>("en");
    const [theme, setThemeState] = useState<ThemeOption>("dark");
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => {
        const savedTheme = window.localStorage.getItem(STORAGE_KEYS.theme) as ThemeOption | null;
        if (savedTheme === "dark" || savedTheme === "light") {
            setThemeState(savedTheme);
            document.documentElement.setAttribute("data-theme", savedTheme);
        }
        else {
            document.documentElement.setAttribute("data-theme", "dark");
        }
        setLanguageState("en");
        document.documentElement.setAttribute("lang", "en");
        window.localStorage.setItem(STORAGE_KEYS.language, "en");
        setHydrated(true);
    }, []);
    const setTheme = useCallback((nextTheme: ThemeOption) => {
        setThemeState(nextTheme);
        document.documentElement.setAttribute("data-theme", nextTheme);
        window.localStorage.setItem(STORAGE_KEYS.theme, nextTheme);
    }, []);
    const setLanguage = useCallback((nextLanguage: AppLanguage) => {
        void nextLanguage;
        setLanguageState("en");
        document.documentElement.setAttribute("lang", "en");
        window.localStorage.setItem(STORAGE_KEYS.language, "en");
    }, []);
    const value = useMemo<AppPreferencesContextValue>(() => {
        const dictionary = getDictionary(language);
        return {
            language,
            theme,
            hydrated,
            setLanguage,
            setTheme,
            t: (key: string, fallback?: string) => translateKey(dictionary, key, fallback),
        };
    }, [hydrated, language, theme]);
    return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>;
}
export const useAppPreferences = () => {
    const context = useContext(AppPreferencesContext);
    if (!context) {
        throw new Error("useAppPreferences must be used within AppPreferencesProvider");
    }
    return context;
};
