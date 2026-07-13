import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Lead, Activity } from "@/types"

export function useLeadDetail(id: string) {
  const [lead, setLead] = useState<Lead | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!id) {
      setLoading(false)
      return
    }

    setLoading(true)

    const { data: leadData } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .single()

    const { data: activityData } = await supabase
      .from("activities")
      .select("*")
      .eq("lead_id", id)
      .order("created_at", {
        ascending: false,
      })

    setLead(leadData)
    setActivities(activityData || [])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [id])

  return {
    lead,
    activities,
    loading,
    refresh: load,
  }
}
