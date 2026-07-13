"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { AppLanguage, getDictionary, translateKey } from "@/lib/i18n"

type ThemeOption = "dark" | "light"

type AppPreferencesContextValue = {
  language: AppLanguage
  theme: ThemeOption
  setLanguage: (language: AppLanguage) => void
  setTheme: (theme: ThemeOption) => void
  t: (key: string, fallback?: string) => string
}

const STORAGE_KEYS = {
  theme: "closeflow_theme",
  language: "closeflow_language",
}

const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(null)

export function AppPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>("de")
  const [theme, setThemeState] = useState<ThemeOption>("dark")

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(STORAGE_KEYS.theme) as ThemeOption | null
    const savedLanguage = window.localStorage.getItem(STORAGE_KEYS.language) as AppLanguage | null

    if (savedTheme === "dark" || savedTheme === "light") {
      setThemeState(savedTheme)
      document.documentElement.setAttribute("data-theme", savedTheme)
    } else {
      document.documentElement.setAttribute("data-theme", "dark")
    }

    if (savedLanguage === "de" || savedLanguage === "en") {
      setLanguageState(savedLanguage)
      document.documentElement.setAttribute("lang", savedLanguage)
    } else {
      document.documentElement.setAttribute("lang", "de")
    }
  }, [])

  const setTheme = (nextTheme: ThemeOption) => {
    setThemeState(nextTheme)
    document.documentElement.setAttribute("data-theme", nextTheme)
    window.localStorage.setItem(STORAGE_KEYS.theme, nextTheme)
  }

  const setLanguage = (nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage)
    document.documentElement.setAttribute("lang", nextLanguage)
    window.localStorage.setItem(STORAGE_KEYS.language, nextLanguage)
  }

  const value = useMemo<AppPreferencesContextValue>(() => {
    const dictionary = getDictionary(language)

    return {
      language,
      theme,
      setLanguage,
      setTheme,
      t: (key: string, fallback?: string) => translateKey(dictionary, key, fallback),
    }
  }, [language, theme])

  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>
}

export const useAppPreferences = () => {
  const context = useContext(AppPreferencesContext)

  if (!context) {
    throw new Error("useAppPreferences must be used within AppPreferencesProvider")
  }

  return context
}
