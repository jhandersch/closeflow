"use client"

import { useEffect, useMemo, useState } from "react"
import AuthGuard from "@/components/AuthGuard"
import { useAppPreferences } from "@/components/AppPreferencesProvider"
import { supabase } from "@/lib/supabase/client"
import TaskBoard from "@/components/tasks/TaskBoard"
import TaskCalendar from "@/components/tasks/TaskCalendar"
import TaskFilters from "@/components/tasks/TaskFilters"
import type { Task, TaskPriority } from "@/types"

type LeadOption = {
  id: string
  name: string | null
  company: string | null
}

const normalizePriority = (value: unknown): TaskPriority => {
  if (value === "low" || value === "medium" || value === "high" || value === "urgent") {
    return value
  }

  return "medium"
}

export default function TasksPage() {
  const { language } = useAppPreferences()
  const isDe = language === "de"
  const locale = isDe ? "de-DE" : "en-US"

  const [tasks, setTasks] = useState<Task[]>([])
  const [leads, setLeads] = useState<LeadOption[]>([])
  const [filter, setFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [taskTitle, setTaskTitle] = useState("")
  const [taskDescription, setTaskDescription] = useState("")
  const [taskLeadId, setTaskLeadId] = useState("")
  const [taskDueDate, setTaskDueDate] = useState("")
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("medium")
  const [creatingTask, setCreatingTask] = useState(false)
  const [taskError, setTaskError] = useState<string | null>(null)

  const getWorkspaceId = async (userId: string) => {
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle()

    return membership?.workspace_id || null
  }

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setTasks([])
        setLeads([])
        setLoading(false)
        return
      }

      const [{ data: taskData }, { data: leadData }] = await Promise.all([
        supabase.from("tasks").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("leads").select("id,name,company").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
      ])

      const normalizedTasks = ((taskData || []) as Task[]).map((task) => ({
        ...task,
        priority: normalizePriority(task.priority),
      }))

      setTasks(normalizedTasks)
      const nextLeads = (leadData || []) as LeadOption[]
      setLeads(nextLeads)
      if (nextLeads.length > 0) {
        setTaskLeadId(nextLeads[0].id)
      }
      setLoading(false)
    }

    void load()
  }, [])

  const createTask = async () => {
    setTaskError(null)

    if (!taskTitle.trim()) {
      setTaskError(isDe ? "Titel ist erforderlich." : "Title is required.")
      return
    }

    if (!taskLeadId) {
      setTaskError(isDe ? "Bitte waehle einen Lead aus." : "Please select a lead.")
      return
    }

    setCreatingTask(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setTaskError(isDe ? "Session abgelaufen. Bitte neu anmelden." : "Session expired. Please sign in again.")
      setCreatingTask(false)
      return
    }

    const workspaceId = await getWorkspaceId(user.id)

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        workspace_id: workspaceId,
        user_id: user.id,
        lead_id: taskLeadId,
        title: taskTitle.trim(),
        description: taskDescription.trim() || null,
        due_date: taskDueDate || null,
        priority: taskPriority,
        completed: false,
      })
      .select()
      .single()

    if (error) {
      setTaskError(error.message)
      setCreatingTask(false)
      return
    }

    setTasks((current) => [{ ...(data as Task), priority: normalizePriority((data as Task).priority) }, ...current])
    setTaskTitle("")
    setTaskDescription("")
    setTaskDueDate("")
    setTaskPriority("medium")
    setCreatingTask(false)
  }

  const toggleTask = async (task: Task) => {
    const nextCompleted = !task.completed

    setTasks((current) =>
      current.map((item) =>
        item.id === task.id
          ? {
              ...item,
              completed: nextCompleted,
              completed_at: nextCompleted ? new Date().toISOString() : null,
            }
          : item
      )
    )

    const { error } = await supabase
      .from("tasks")
      .update({
        completed: nextCompleted,
        completed_at: nextCompleted ? new Date().toISOString() : null,
      })
      .eq("id", task.id)

    if (error) {
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id
            ? {
                ...item,
                completed: task.completed,
                completed_at: task.completed ? item.completed_at || null : null,
              }
            : item
        )
      )
    }
  }

  const deleteTask = async (taskId: string) => {
    const previous = tasks
    setTasks((current) => current.filter((task) => task.id !== taskId))

    const { error } = await supabase.from("tasks").delete().eq("id", taskId)
    if (error) {
      setTasks(previous)
    }
  }

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

        <section className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
          <h2 className="text-lg font-semibold text-foreground">{isDe ? "Aufgabe erstellen" : "Create task"}</h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <input
              value={taskTitle}
              onChange={(event) => setTaskTitle(event.target.value)}
              placeholder={isDe ? "Titel" : "Title"}
              className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-2 text-sm text-foreground outline-none"
            />

            <input
              value={taskDescription}
              onChange={(event) => setTaskDescription(event.target.value)}
              placeholder={isDe ? "Beschreibung (optional)" : "Description (optional)"}
              className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-2 text-sm text-foreground outline-none"
            />

            <select
              value={taskLeadId}
              onChange={(event) => setTaskLeadId(event.target.value)}
              className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-2 text-sm text-foreground outline-none"
            >
              {leads.length === 0 ? (
                <option value="">{isDe ? "Keine Leads verfuegbar" : "No leads available"}</option>
              ) : (
                leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {(lead.name || (isDe ? "Unbenannt" : "Untitled")) + (lead.company ? ` - ${lead.company}` : "")}
                  </option>
                ))
              )}
            </select>

            <input
              type="date"
              value={taskDueDate}
              onChange={(event) => setTaskDueDate(event.target.value)}
              className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-2 text-sm text-foreground outline-none"
            />

            <select
              value={taskPriority}
              onChange={(event) => setTaskPriority(event.target.value as TaskPriority)}
              className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-2 text-sm text-foreground outline-none"
            >
              <option value="low">{isDe ? "Niedrig" : "Low"}</option>
              <option value="medium">{isDe ? "Mittel" : "Medium"}</option>
              <option value="high">{isDe ? "Hoch" : "High"}</option>
              <option value="urgent">{isDe ? "Dringend" : "Urgent"}</option>
            </select>
          </div>

          {taskError ? <p className="mt-3 text-sm text-rose-300">{taskError}</p> : null}

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-foreground/55">
              {isDe ? "Fuer aktive Follow-up-Prozesse." : "For active follow-up workflows."}
            </p>
            <button
              type="button"
              onClick={() => void createTask()}
              disabled={creatingTask || leads.length === 0}
              className="rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-60"
            >
              {creatingTask ? (isDe ? "Speichert..." : "Saving...") : (isDe ? "Aufgabe speichern" : "Save task")}
            </button>
          </div>
        </section>

        <TaskFilters value={filter} onChange={setFilter} />

        {loading ? (
          <p className="text-foreground/65">{isDe ? "Lade..." : "Lädt..."}</p>
        ) : (
          <div className="space-y-6">
            <TaskBoard tasks={filteredTasks} onToggleTask={toggleTask} onDeleteTask={deleteTask} locale={locale} isDe={isDe} />
            <TaskCalendar tasks={filteredTasks.filter((task) => Boolean(task.due_date))} />
          </div>
        )}
      </div>
    </AuthGuard>
  )
}
