export type ActivityType =
  | "created"
  | "status_changed"
  | "note_added"
  | "email_sent"
  | "call_completed"
  | "task_created"
  | "task_completed"
  | "meeting_created"
  | "meeting_updated"
  | "meeting_completed"
  | "meeting_deleted"
  | "ai"
  | "other"



export type Activity = {
  id: string
  workspace_id?: string | null
  lead_id: string | null
  user_id: string
  type: ActivityType
  title?: string | null
  description: string | null
  metadata?: Record<string, unknown> | null
  action?: string | null
  created_by?: string | null
  created_at: string
}