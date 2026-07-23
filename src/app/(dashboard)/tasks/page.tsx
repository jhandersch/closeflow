"use client"

import { useEffect, useMemo, useState } from "react"
import AuthGuard from "@/components/AuthGuard"
import { useAppPreferences } from "@/components/AppPreferencesProvider"
import { supabase } from "@/lib/supabase/client"
import TaskBoard from "@/components/tasks/TaskBoard"
import TaskCalendar from "@/components/tasks/TaskCalendar"
import TaskFilters from "@/components/tasks/TaskFilters"
import type { Task, TaskPriority } from "@/types"

const normalizePriority = (value: unknown): TaskPriority => {
  if (value === "low" || value === "medium" || value === "high") {
    return value
  }

  return "medium"
}

export default function TasksPage() {
  const { language } = useAppPreferences()
  const isDe = language === "de"

  const [tasks, setTasks] = useState<Task[]>([])
  const [filter, setFilter] = useState("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setTasks([])
        setLoading(false)
        return
      }

      const { data } = await supabase.from("tasks").select("*").eq("user_id", user.id).order("created_at", { ascending: false })

      const normalizedTasks = ((data || []) as Task[]).map((task) => ({
        ...task,
        priority: normalizePriority(task.priority),
      }))

      setTasks(normalizedTasks)
      setLoading(false)
    }

    void load()
  }, [])

  const filteredTasks = useMemo(() => {
    if (filter === "open") return tasks.filter((task) => !task.completed)
    if (filter === "completed") return tasks.filter((task) => task.completed)
    if (filter === "overdue") {
      const today = new Date().toISOString().slice(0, 10)
      return tasks.filter((task) => !task.completed && task.due_date && task.due_date.slice(0, 10) < today)
    }
    return tasks
  }, [filter, tasks])

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">{isDe ? "Aufgaben" : "Tasks"}</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{isDe ? "Sales-Aufgaben" : "Sales tasks"}</h1>
          <p className="mt-2 text-sm text-foreground/65">{isDe ? "Verfolge Follow-up-Arbeit in deinem Workspace." : "Track follow-up work across your workspace."}</p>
        </div>

        <TaskFilters value={filter} onChange={setFilter} />

        {loading ? (
          <p className="text-foreground/65">{isDe ? "Lade..." : "Lädt..."}</p>
        ) : (
          <div className="space-y-6">
            <TaskBoard tasks={filteredTasks} />
            <TaskCalendar tasks={filteredTasks.filter((task) => Boolean(task.due_date))} />
          </div>
        )}
      </div>
    </AuthGuard>
  )
}
