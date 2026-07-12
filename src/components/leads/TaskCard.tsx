"use client"

type Props = {
  title:string
  completed:boolean
  dueDate:string | null
  onToggle:()=>void
  onDelete:()=>void
}


export default function TaskCard({
  title,
  completed,
  dueDate,
  onToggle,
  onDelete
}:Props){

return (

<div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#111] p-4">


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
"line-through text-zinc-500"
:
"text-white"
}
>
{title}
</p>


{
dueDate && (
<p className="text-xs text-zinc-500">
Fällig: {new Date(dueDate).toLocaleDateString()}
</p>
)
}


</div>

</div>


<button
onClick={onDelete}
className="text-red-400 text-sm"
>
Delete
</button>


</div>

)

}