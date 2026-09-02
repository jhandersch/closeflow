import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Lead, Activity } from "@/types"

export function useLeadDetail(id: string) {
  const [lead, setLead] = useState<Lead | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!id) {
      setLead(null)
      setActivities([])
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      /*
       * =========================
       * LOAD LEAD
       * =========================
       */

      const {
        data: leadData,
        error: leadError,
      } = await supabase
        .from("leads")
        .select("*")
        .eq("id", id)
        .single()

      if (leadError) {
        console.error("Failed to load lead:", leadError)
        setLead(null)
      } else {
        setLead(leadData)
      }

      /*
       * =========================
       * LOAD ACTIVITIES
       * =========================
       */

      const {
        data: activityData,
        error: activityError,
      } = await supabase
        .from("activities")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", {
          ascending: false,
        })

      if (activityError) {
        console.error(
          "Failed to load activities:",
          activityError
        )

        setActivities([])
      } else {
        console.log(
          "Loaded activities:",
          activityData
        )

        setActivities(
          (activityData || []) as Activity[]
        )
      }
    } catch (error) {
      console.error(
        "Unexpected error loading lead:",
        error
      )

      setLead(null)
      setActivities([])
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  return {
    lead,
    setLead,
    activities,
    loading,
    refresh: load,
  }
}
