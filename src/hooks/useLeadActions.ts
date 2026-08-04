import { supabase } from "@/lib/supabase/client"
import type { ActivityType, LeadSource, LeadStatus } from "@/types"
import { runLeadAutomation } from "@/lib/automation"


type UpdateLeadData = {
  name?: string
  company?: string
  status?: LeadStatus
  value?: number
  notes?: string
  source?: LeadSource | null
  tags?: string[]
  email?: string
  phone?: string
  address?: string
  website?: string
}


export function useLeadActions(
  onSuccess?: (newStatus: LeadStatus) => Promise<void>,
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

  async function changeLeadStatus(
  leadId: string,
  oldStatus: LeadStatus,
  newStatus: LeadStatus
) {
  if (oldStatus === newStatus) return

  const session = await supabase.auth.getSession()

  const response = await fetch("/api/leads", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${
        session.data.session?.access_token ?? ""
      }`,
    },
    body: JSON.stringify({
      id: leadId,
      status: newStatus,
    }),
  })

  if (!response.ok) {
    throw new Error("Status update failed")
  }

  if (onSuccess) {
    await onSuccess(newStatus)
  }
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

    if (
      data.status &&
      oldStatus !== data.status
    ) {
      updateData.stage_changed_at = new Date().toISOString()
    }

    const session = await supabase.auth.getSession()

const response = await fetch("/api/leads", {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${
      session.data.session?.access_token ?? ""
    }`,
  },
  body: JSON.stringify({
    id: leadId,
    ...updateData,
  }),
})

if (!response.ok) {
  throw new Error("Lead update failed")
}

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
    changeLeadStatus,
  }

}