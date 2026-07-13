"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode
}) {
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
      <div className="min-h-screen bg-surface-2 text-foreground flex items-center justify-center">
        Loading session...
      </div>
    )
  }

  return <>{children}</>
}
