export type TaskStatus = "open" | "completed" | "overdue"

export type TaskPriority = "low" | "medium" | "high"

export type Task = {
  id: string
  workspace_id?: string | null
  lead_id: string
  user_id: string
  title: string
  description?: string | null
  completed: boolean
  priority: TaskPriority
  status?: TaskStatus
  assigned_to?: string | null
  due_date: string | null
  completed_at?: string | null
  created_at: string
}
