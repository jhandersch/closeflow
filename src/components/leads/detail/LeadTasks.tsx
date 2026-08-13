"use client"

import { useState } from "react"

import type { TaskPriority } from "@/types"

import TaskCard from "@/components/leads/TaskCard"


type Task = {
  id:string
  title:string
  completed:boolean
  due_date:string | null
  priority:TaskPriority
}


type Props = {
  tasks:Task[]
  addTask:(
    title:string,
    dueDate?:string,
    priority?:TaskPriority
  )=>Promise<void>

  toggleTask:(
    id:string,
    completed:boolean
  )=>Promise<void>

  deleteTask:(
    id:string
  )=>Promise<void>

  editTask:(
    id:string,
    updates:{
      title:string
      priority:TaskPriority
      due_date:string | null
    }
  )=>Promise<void>
  isDe:boolean
}



export default function LeadTasks({
 tasks,
 addTask,
 editTask,
 toggleTask,
 deleteTask,
 isDe
}:Props){


const [title,setTitle]=useState("")
const [date,setDate]=useState("")
const [priority,setPriority]=
useState<TaskPriority>("medium")



async function createTask(){

 if(!title.trim())
 return


 await addTask(
  title,
  date || undefined,
  priority
 )


 setTitle("")
 setDate("")
 setPriority("medium")

}



return (

<div
className="
space-y-5
rounded-xl
border
border-border-subtle
bg-surface-1
p-6
"
>


<h2 className="text-xl font-semibold">
{isDe?"Aufgaben":"Tasks"}
</h2>



<div
className="
flex
flex-col
gap-3
md:flex-row
"
>


<input
value={title}
onChange={
e=>setTitle(e.target.value)
}
placeholder={
isDe
?"Neue Aufgabe..."
:"New task..."
}
className="
flex-1
rounded-xl
border
border-border-subtle
bg-surface-2
px-4
py-3
"
/>



<input
type="date"
value={date}
onChange={
e=>setDate(e.target.value)
}
className="
rounded-xl
border
border-border-subtle
bg-surface-2
px-4
py-3
"
/>



<select
value={priority}
onChange={
e=>setPriority(
e.target.value as TaskPriority
)
}
className="
rounded-xl
border
border-border-subtle
bg-surface-2
px-4
py-3
"
>

<option value="low">
Low
</option>

<option value="medium">
Medium
</option>

<option value="high">
High
</option>

<option value="urgent">
Urgent
</option>

</select>



<button
onClick={createTask}
className="
rounded-xl
bg-foreground
px-5
py-3
font-semibold
text-background
"
>
{isDe?"Hinzufügen":"Add"}
</button>


</div>



<div className="space-y-3">


{
tasks.map(task=>(

<TaskCard
  key={task.id}
  id={task.id}
  title={task.title}
  completed={task.completed}
  dueDate={task.due_date}
  priority={task.priority}
  onToggle={() =>
    toggleTask(task.id, task.completed)
  }
  onDelete={() =>
    deleteTask(task.id)
  }
  onEdit={editTask}
/>

))
}



{
tasks.length===0 && (

<p className="text-sm text-foreground/55">
{isDe
?"Noch keine Aufgaben."
:"No tasks yet."
}
</p>

)

}


</div>


</div>

)

}