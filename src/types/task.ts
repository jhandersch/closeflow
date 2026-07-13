export type TaskStatus = "open" | "completed" | "overdue"

export type TaskPriority = "low" | "medium" | "high"

export type Task = {
  id: string
  lead_id: string
  user_id: string
  title: string
  completed: boolean
  priority: TaskPriority
  due_date: string | null
  created_at: string
}
