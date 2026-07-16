export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "won"
  | "lost"

export type LeadSource =
  | "website"
  | "recommendation"
  | "phone"
  | "advertising"
  | "other"


export type Lead = {
  id: string
  workspace_id?: string | null
  name: string
  company: string
  status: LeadStatus
  value: number
  created_at: string
  updated_at?: string
  stage_changed_at?: string
  notes?: string
  source?: LeadSource | null
  industry?: string | null
  employees?: number | null
  country?: string | null
  tags?: string[] | null
  email?: string | null
  phone?: string | null
  address?: string | null
  website?: string | null
  assigned_to?: string | null
  owner_id?: string | null
  next_action?: string | null
  last_activity_at?: string | null
  last_contact_at?: string | null
  next_action_date?: string
  lost_reason?: string | null
  probability?: number | null
}