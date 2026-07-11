import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"


export type Lead = {
  id: string
  name: string
  company: string
  status: string
  value: number
  created_at: string
  notes?: string
  stage_changed_at?: string
}


export type Activity = {
  id: string
  action: string
  type?: string
  created_at: string
}


export function useLeadDetail(id: string) {

  const [lead, setLead] = useState<Lead | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)


  async function load() {

    if (!id) return

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
    load()
  }, [id])


  return {
    lead,
    activities,
    loading,
    refresh: load,
  }

}