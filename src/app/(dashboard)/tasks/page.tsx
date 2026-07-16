"use client"

import { useEffect, useMemo, useState } from "react"
import AuthGuard from "@/components/AuthGuard"
import { supabase } from "@/lib/supabase/client"
import TaskBoard from "@/components/tasks/TaskBoard"
import TaskCalendar from "@/components/tasks/TaskCalendar"
import TaskFilters from "@/components/tasks/TaskFilters"

export default function TasksPage() {
  const [tasks, setTasks] = useState<Array<{ id: string; title: string; priority: string; due_date: string | null; completed: boolean; user_id: string }>>([])
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
      setTasks((data || []) as typeof tasks)
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
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">Tasks</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">Sales tasks</h1>
          <p className="mt-2 text-sm text-foreground/65">Track follow-up work across your workspace.</p>
        </div>

        <TaskFilters value={filter} onChange={setFilter} />

        {loading ? (
          <p className="text-foreground/65">Loading...</p>
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
