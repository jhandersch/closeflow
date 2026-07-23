"use client"

import { useAppPreferences } from "@/components/AppPreferencesProvider"

export default function LoadingPage() {
  const { language, t } = useAppPreferences()
  const isDe = language === "de"

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="w-full max-w-md rounded-3xl border border-border-subtle bg-surface-1 p-8 shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_8%,transparent)]">
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 animate-pulse rounded-2xl bg-cyan-500/20" />
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-400">CloseFlow</p>
            <h1 className="mt-1 text-xl font-semibold text-foreground">
              {t("auth.sessionLoading", isDe ? "Session wird geladen..." : "Loading session...")}
            </h1>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div className="h-3 w-full animate-pulse rounded-full bg-foreground/10" />
          <div className="h-3 w-5/6 animate-pulse rounded-full bg-foreground/10" />
          <div className="h-3 w-2/3 animate-pulse rounded-full bg-foreground/10" />
        </div>

        <p className="mt-6 text-sm leading-7 text-foreground/65">
          {isDe
            ? "Wir laden deine Daten und stellen die Seite sauber wieder her."
            : "We are loading your data and restoring the page cleanly."}
        </p>
      </div>
    </div>
  )
}

