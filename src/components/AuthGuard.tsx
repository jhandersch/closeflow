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
  const { language, hydrated, t } = useAppPreferences()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(true)

  const nextPath = `${pathname}${
    searchParams.toString()
      ? `?${searchParams.toString()}`
      : ""
  }`

  useEffect(() => {
    let mounted = true

    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          router.replace(
            `/login?next=${encodeURIComponent(nextPath)}`
          )
          return
        }

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user?.user_metadata?.onboarding_completed) {
          router.replace(
            `/onboarding?next=${encodeURIComponent(nextPath)}`
          )
          return
        }

        if (mounted) {
          setLoading(false)
        }
      } catch (error) {
        console.error("AUTH GUARD ERROR:", error)

        if (mounted) {
          setLoading(false)
        }
      }
    }

    void checkSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          router.replace(
            `/login?next=${encodeURIComponent(nextPath)}`
          )
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router, nextPath])

  if (loading) {
    const loadingTitle = hydrated
      ? t(
          "auth.sessionLoading",
          "Loading session..."
        )
      : "Loading session..."

    const loadingBody = hydrated
      ? language === "de"
        ? "Wir bereiten deinen Workspace vor und stellen deine Sitzung sicher wieder her."
        : "We are preparing your workspace and restoring your session securely."
      : "We are preparing your workspace and restoring your session securely."

    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl border border-border-subtle bg-surface-1 p-8 shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_8%,transparent)]">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 animate-pulse rounded-2xl bg-cyan-500/20" />

            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-400">
                CloseFlow
              </p>

              <h1 className="mt-1 text-xl font-semibold text-foreground">
                {loadingTitle}
              </h1>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="h-3 w-full animate-pulse rounded-full bg-foreground/10" />
            <div className="h-3 w-5/6 animate-pulse rounded-full bg-foreground/10" />
            <div className="h-3 w-2/3 animate-pulse rounded-full bg-foreground/10" />
          </div>

          <p className="mt-6 text-sm leading-7 text-foreground/65">
            {loadingBody}
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
