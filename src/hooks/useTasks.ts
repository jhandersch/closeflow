"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import type { ActivityType, Task, TaskPriority } from "@/types"

export function useTasks(leadId: string) {

  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const getWorkspaceId = async (userId: string) => {
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle()

    return membership?.workspace_id || null
  }


  const loadTasks = async () => {

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

    const workspaceId = await getWorkspaceId(user.id)



    const {
      data: createdTask,
      error
    } = await supabase
      .from("tasks")
      .insert({
        workspace_id: workspaceId,
        user_id: user.id,
        lead_id: leadId,
        title,
        due_date: dueDate || null,
        priority,
        completed: false,
      })
      .select()
      .single()



    if(error) {
      throw error
    }



    if(createdTask){

      setTasks(prev => [
        createdTask,
        ...prev
      ])

    }



    await supabase
      .from("activities")
      .insert({
        workspace_id: workspaceId,
        lead_id: leadId,
        user_id: user.id,
        title: `Task created: ${title}`,
        description: `Task created: ${title}`,
        action:`Task created: ${title}`,
        type:"task_created" as ActivityType,
        metadata: {
          task_id: createdTask?.id || null,
          due_date: dueDate || null,
          priority,
        },
      })

  }





  const toggleTask = async (
    id:string,
    completed:boolean
  ) => {


    const nextCompleted = !completed



    setTasks(prev =>
      prev.map(task =>
        task.id === id
        ? {
            ...task,
            completed:nextCompleted
          }
        : task
      )
    )



    await supabase
      .from("tasks")
      .update({
        completed:nextCompleted
      })
      .eq("id",id)



    if(nextCompleted){

      const {
        data:{user}
      } = await supabase.auth.getUser()


      if(user){
        const workspaceId = await getWorkspaceId(user.id)

        await supabase
          .from("activities")
          .insert({
            workspace_id: workspaceId,
            lead_id:leadId,
            user_id:user.id,
            title:"Task completed",
            description:"Task completed",
            action:"Task completed",
            type:"task_completed" as ActivityType,
            metadata: {
              task_id: id,
            },
          })

      }

    }

  }




  const deleteTask = async (
    id:string
  ) => {


    setTasks(prev =>
      prev.filter(
        task=>task.id!==id
      )
    )


    await supabase
      .from("tasks")
      .delete()
      .eq("id",id)

  }



  return {
    tasks,
    loading,
    addTask,
    toggleTask,
    deleteTask,
  }
}