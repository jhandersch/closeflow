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
  name: string
  company: string
  status: LeadStatus
  value: number
  created_at: string
  updated_at?: string
  stage_changed_at?: string
  notes?: string
  source?: LeadSource | null
  tags?: string[] | null
  email?: string | null
  phone?: string | null
  address?: string | null
  website?: string | null
  owner_id?: string | null
  next_action?: string | null
  last_activity_at?: string | null
  next_action_date?: string
}