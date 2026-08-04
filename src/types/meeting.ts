export type MeetingStatus =
  | "scheduled"
  | "completed"
  | "cancelled"


export type Meeting = {
  id: string
  lead_id: string
  user_id: string
  title: string
  description: string | null
  starts_at: string
  status?: MeetingStatus
  created_at: string
}