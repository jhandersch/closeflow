"use client"


import { useState } from "react"
import type { LeadStatus, UpdateLeadData } from "@/types"
import type { Lead } from "@/types"




type Props = {
  lead: Lead
  saveLead: (
    id: string,
    oldStatus: LeadStatus,
    data: UpdateLeadData
  ) => Promise<void>
  isDe: boolean
}



export default function LeadNotes({
 lead,
 saveLead,
 isDe
}:Props){


const [notes,setNotes]=
useState(
lead.notes ?? ""
)


const [saving,setSaving]=
useState(false)



async function save(){

setSaving(true)


await saveLead(
 lead.id,
 lead.status,
 {
  notes
 }
)


setSaving(false)

}



return (

<div
className="
space-y-4
rounded-xl
border
border-border-subtle
bg-surface-1
p-6
"
>


<h2 className="text-xl font-semibold">
{isDe?"Notizen":"Notes"}
</h2>



<textarea
value={notes}
onChange={
e=>setNotes(e.target.value)
}
className="
h-52
w-full
rounded-2xl
border
border-border-subtle
bg-surface-2
px-4
py-3
"
/>



<div className="flex justify-end">


<button
onClick={save}
disabled={saving}
className="
rounded-xl
bg-foreground
px-6
py-3
font-semibold
text-background
"
>

{
saving
?
(isDe?"Speichern...":"Saving...")
:
(isDe?"Notizen speichern":"Save notes")
}

</button>


</div>


</div>

)

}