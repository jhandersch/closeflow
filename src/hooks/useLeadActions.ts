import { supabase } from "@/lib/supabase/client"
import type { ActivityType, LeadSource, LeadStatus } from "@/types"

type UpdateLeadData = {
  name: string
  company: string
  status: LeadStatus
  value: number
  notes: string
  source?: LeadSource | null
  tags?: string[]
  email?: string
  phone?: string
  address?: string
  website?: string
}


export function useLeadActions(
  refresh: () => Promise<void>
) {

  const stripExtendedLeadFields = (payload: Record<string, unknown>) => {
    const sanitized = { ...payload }
    delete sanitized.source
    delete sanitized.tags
    delete sanitized.email
    delete sanitized.phone
    delete sanitized.address
    delete sanitized.website
    return sanitized
  }


  async function saveLead(
    leadId: string,
    oldStatus: LeadStatus,
    data: UpdateLeadData
  ) {
    const { data: beforeUpdateLead } = await supabase
      .from("leads")
      .select("notes")
      .eq("id", leadId)
      .single()

    const updateData: Record<string, unknown> = {
      ...data,
      last_activity_at: new Date().toISOString(),
    }

    if (oldStatus !== data.status) {
      updateData.stage_changed_at = new Date().toISOString()
    }

    let { error } = await supabase
      .from("leads")
      .update(updateData)
      .eq("id", leadId)

    if (error && /column .* does not exist/i.test(error.message || "")) {
      const fallbackPayload = stripExtendedLeadFields(updateData)
      const retry = await supabase
        .from("leads")
        .update(fallbackPayload)
        .eq("id", leadId)
      error = retry.error
    }



    if (error) {
      throw error
    }



    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user

    if (user) {
      const activities: Array<{
        lead_id: string
        user_id: string
        action: string
        type: ActivityType
      }> = []

      if (oldStatus !== data.status) {
        activities.push({
          lead_id: leadId,
          user_id: user.id,
          action: `Status changed from ${oldStatus} to ${data.status}`,
          type: "status_changed",
        })
      }

      const previousNotes = (beforeUpdateLead?.notes ?? "").trim()
      const updatedNotes = data.notes.trim()
      if (previousNotes !== updatedNotes) {
        activities.push({
          lead_id: leadId,
          user_id: user.id,
          action: "Lead notes updated",
          type: "note_added",
        })
      }

      if (activities.length === 0) {
        activities.push({
          lead_id: leadId,
          user_id: user.id,
          action: "Lead details updated",
          type: "other",
        })
      }

      await supabase.from("activities").insert(activities)
    }

    await refresh()

  }



  async function deleteLead(leadId: string) {
    const { error: taskError } = await supabase
      .from("tasks")
      .delete()
      .eq("lead_id", leadId)

    if (taskError) {
      throw taskError
    }

    const { error: activityError } = await supabase
      .from("activities")
      .delete()
      .eq("lead_id", leadId)

    if (activityError) {
      throw activityError
    }

    const { error } = await supabase
      .from("leads")
      .delete()
      .eq("id", leadId)

    if (error) {
      throw error
    }
  }



  return {
    saveLead,
    deleteLead,
  }

}