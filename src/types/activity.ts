export type ActivityType =
  | "created"
  | "status_changed"
  | "note_added"
  | "email_sent"
  | "call_completed"
  | "task_created"
  | "task_completed"
  | "ai"
  | "other"

export type Activity = {
  id: string
  lead_id: string
  user_id: string
  action: string
  title?: string | null
  description?: string | null
  created_by?: string | null
  type?: ActivityType
  created_at: string
}
