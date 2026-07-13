"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import type { ActivityType, Task, TaskPriority } from "@/types"

export function useTasks(leadId: string) {

  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const loadTasks = async () => {

    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()


    if (!user) {
      setTasks([])
      setLoading(false)
      return
    }


    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", {
        ascending: false,
      })


    setTasks(data || [])

    setLoading(false)
  }


  useEffect(() => {

    if (leadId) {
      loadTasks()
    }

  }, [leadId])


  const addTask = async (
    title: string,
    dueDate?: string,
    priority: TaskPriority = "medium"
  ) => {

    const {
      data: { user },
    } = await supabase.auth.getUser()


    if (!user) return


    let { error } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        lead_id: leadId,
        title,
        due_date: dueDate || null,
        priority,
      })

    if (error && /column .* does not exist/i.test(error.message || "")) {
      const retry = await supabase
        .from("tasks")
        .insert({
          user_id: user.id,
          lead_id: leadId,
          title,
          due_date: dueDate || null,
        })
      error = retry.error
    }

    if (error) {
      throw error
    }

    await supabase
      .from("activities")
      .insert({
        lead_id: leadId,
        user_id: user.id,
        action: `Task created: ${title}`,
        type: "task_created" as ActivityType,
      })


    loadTasks()
  }


  const toggleTask = async (
    id:string,
    completed:boolean
  ) => {

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const nextCompleted = !completed


    await supabase
      .from("tasks")
      .update({
        completed: nextCompleted,
      })
      .eq("id", id)

    if (user && nextCompleted) {
      await supabase
        .from("activities")
        .insert({
          lead_id: leadId,
          user_id: user.id,
          action: "Task completed",
          type: "task_completed" as ActivityType,
        })
    }


    loadTasks()
  }


  const deleteTask = async (
    id:string
  ) => {

    await supabase
      .from("tasks")
      .delete()
      .eq("id", id)


    loadTasks()
  }


  return {
    tasks,
    loading,
    addTask,
    toggleTask,
    deleteTask,
  }
}