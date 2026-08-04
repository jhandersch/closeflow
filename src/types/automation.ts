export type AutomationTrigger =
  | "contacted_followup"
  | "proposal_followup"
  | "meeting_followup"
  | "inactive_lead"
  | "won_onboarding"

export type LeadAutomation = {
  id: string
  workspace_id: string | null

  lead_id: string

  trigger_key: AutomationTrigger

  task_id: string | null

  created_at: string
}