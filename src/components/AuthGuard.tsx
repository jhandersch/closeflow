"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { useAppPreferences } from "@/components/AppPreferencesProvider"

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode
}) {
  const { language, t } = useAppPreferences()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)

  const nextPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`
  const encodedNextPath = encodeURIComponent(nextPath)

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()

      if (!data.session) {
        router.replace(`/login?next=${encodedNextPath}`)
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user?.user_metadata?.onboarding_completed) {
        router.replace(`/onboarding?next=${encodedNextPath}`)
        return
      }

      setLoading(false)
    }

    void checkSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace(`/login?next=${encodedNextPath}`)
      }
    })

    return () => subscription.unsubscribe()
  }, [encodedNextPath, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl border border-border-subtle bg-surface-1 p-8 shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_8%,transparent)]">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 animate-pulse rounded-2xl bg-cyan-500/20" />
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-400">CloseFlow</p>
              <h1 className="mt-1 text-xl font-semibold text-foreground">
                {t("auth.sessionLoading", language === "de" ? "Session wird geladen..." : "Loading session...")}
              </h1>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="h-3 w-full animate-pulse rounded-full bg-foreground/10" />
            <div className="h-3 w-5/6 animate-pulse rounded-full bg-foreground/10" />
            <div className="h-3 w-2/3 animate-pulse rounded-full bg-foreground/10" />
          </div>

          <p className="mt-6 text-sm leading-7 text-foreground/65">
            {language === "de"
              ? "Wir bereiten deinen Workspace vor und stellen deine Sitzung sicher wieder her."
              : "We are preparing your workspace and restoring your session securely."}
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
