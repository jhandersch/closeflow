import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Lead } from "@/types"

type Activity = {
  id: string
  action: string
  type?: string
  created_at: string
}

type UseLeadsDataOptions = {
  activityLimit?: number
}

export function useLeadsData({ activityLimit = 6 }: UseLeadsDataOptions = {}) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data: userData, error: userError } = await supabase.auth.getUser()
    const user = userData.user

    if (userError || !user) {
      setLeads([])
      setActivities([])
      setLoading(false)
      return
    }

    const [{ data: leadsData, error: leadsError }, { data: activityData, error: activityError }] =
      await Promise.all([
        supabase
          .from("leads")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("activities")
          .select("id, action, type, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(activityLimit),
      ])

    if (leadsError) {
      setError(leadsError.message)
      setLoading(false)
      return
    }

    if (activityError) {
      setError(activityError.message)
      setLoading(false)
      return
    }

    setLeads((leadsData as Lead[]) || [])
    setActivities((activityData as Activity[]) || [])
    setLoading(false)
  }, [activityLimit])

  useEffect(() => {
    void load()
  }, [load])

  return { leads, activities, loading, error, refresh: load }
}

export type { Lead, Activity }
