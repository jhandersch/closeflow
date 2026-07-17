"use client"

import type { TaskPriority } from "@/types"
import { useAppPreferences } from "@/components/AppPreferencesProvider"

type Props = {
  title:string
  completed:boolean
  dueDate:string | null
  priority?: TaskPriority | null
  onToggle:()=>void
  onDelete:()=>void
}


export default function TaskCard({
  title,
  completed,
  dueDate,
  priority,
  onToggle,
  onDelete
}:Props){
const { language } = useAppPreferences()
const isDe = language === "de"

const isOverdue = Boolean(
  dueDate &&
  !completed &&
  new Date(dueDate).getTime() < Date.now()
)

const statusLabel = completed
  ? (isDe ? "erledigt" : "done")
  : isOverdue
  ? (isDe ? "überfällig" : "overdue")
  : (isDe ? "offen" : "open")

const priorityLabel = (priority || "medium").toUpperCase()

return (

<div className="flex items-center justify-between rounded-xl border border-border-subtle bg-surface-1 p-4">


<div className="flex items-center gap-3">


<input
type="checkbox"
checked={completed}
onChange={onToggle}
/>


<div>

<p
className={
completed
?
"line-through text-foreground/55"
:
"text-foreground"
}
>
{title}
</p>

<div className="mt-1 flex items-center gap-2">
<span className="rounded-full bg-surface-2/80 px-2 py-0.5 text-[10px] font-semibold text-foreground/80">
{priorityLabel}
</span>
<span
className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
statusLabel === "erledigt"
|| statusLabel === "done"
? "bg-emerald-500/20 text-emerald-300"
: statusLabel === (isDe ? "überfällig" : "overdue")
? "bg-red-500/20 text-red-300"
: "bg-blue-500/20 text-blue-300"
}`}
>
{statusLabel}
</span>
</div>


{
dueDate && (
<p className="text-xs text-foreground/55">
{isDe ? "Fällig" : "Due"}: {new Date(dueDate).toLocaleDateString()}
</p>
)
}


</div>

</div>


<button
onClick={onDelete}
className="text-red-400 text-sm"
>
{isDe ? "Löschen" : "Delete"}
</button>


</div>

)

}
