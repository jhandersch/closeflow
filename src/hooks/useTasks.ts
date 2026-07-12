"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"

type Task = {
  id: string
  title: string
  completed: boolean
  due_date: string | null
  lead_id: string
  created_at: string
}

export function useTasks(leadId: string) {

  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const loadTasks = async () => {

    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()


    if (!user) return


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
    dueDate?: string
  ) => {

    const {
      data: { user },
    } = await supabase.auth.getUser()


    if (!user) return


    await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        lead_id: leadId,
        title,
        due_date: dueDate || null,
      })


    loadTasks()
  }


  const toggleTask = async (
    id:string,
    completed:boolean
  ) => {


    await supabase
      .from("tasks")
      .update({
        completed: !completed,
      })
      .eq("id", id)


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