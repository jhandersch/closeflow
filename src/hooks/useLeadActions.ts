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

  const getWorkspaceId = async (userId: string) => {
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle()

    return membership?.workspace_id || null
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

    const { error } = await supabase
      .from("leads")
      .update(updateData)
      .eq("id", leadId)

    if (error) {
      throw error
    }



    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user

    if (user) {
      const workspaceId = await getWorkspaceId(user.id)

      const activities: Array<{
        workspace_id: string | null
        lead_id: string
        user_id: string
        title: string
        description: string | null
        action: string
        type: ActivityType
        metadata: Record<string, unknown>
      }> = []

      if (oldStatus !== data.status) {
        const action = `Status changed from ${oldStatus} to ${data.status}`
        activities.push({
          workspace_id: workspaceId,
          lead_id: leadId,
          user_id: user.id,
          title: action,
          description: action,
          action,
          type: "status_changed",
          metadata: {
            previous_status: oldStatus,
            next_status: data.status,
          },
        })
      }

      const previousNotes = (beforeUpdateLead?.notes ?? "").trim()
      const updatedNotes = data.notes.trim()
      if (previousNotes !== updatedNotes) {
        const action = "Lead notes updated"
        activities.push({
          workspace_id: workspaceId,
          lead_id: leadId,
          user_id: user.id,
          title: action,
          description: action,
          action,
          type: "note_added",
          metadata: {
            had_notes_before: previousNotes.length > 0,
            has_notes_now: updatedNotes.length > 0,
          },
        })
      }

      if (activities.length === 0) {
        const action = "Lead details updated"
        activities.push({
          workspace_id: workspaceId,
          lead_id: leadId,
          user_id: user.id,
          title: action,
          description: action,
          action,
          type: "other",
          metadata: {
            changed_fields: ["name", "company", "value", "source", "contact"],
          },
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