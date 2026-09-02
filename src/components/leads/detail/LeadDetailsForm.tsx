"use client"

import { useState } from "react"
import toast from "react-hot-toast"

import type {
  Lead,
  LeadSource,
  LeadStatus,
  UpdateLeadData
} from "@/types"



type Props = {

  lead: Lead

  saveLead:(
    id:string,
    oldStatus:LeadStatus,
    data:UpdateLeadData
  )=>Promise<void>

  isDe:boolean

  onSaved: () => Promise<void>

}



export default function LeadDetailsForm({
  lead,
  saveLead,
  isDe,
  onSaved,
}:Props){



const [name,setName]=
useState(lead.name)


const [company,setCompany]=
useState(lead.company)


const [status,setStatus]=
useState<LeadStatus>(
 lead.status
)


const [value,setValue]=
useState(
 String(lead.value ?? 0)
)


const [email,setEmail]=
useState(
 lead.email ?? ""
)


const [phone,setPhone]=
useState(
 lead.phone ?? ""
)


const [website,setWebsite]=
useState(
 lead.website ?? ""
)


const [address,setAddress]=
useState(
 lead.address ?? ""
)

const [nextAction,setNextAction]=
useState(
  lead.next_action ?? ""
)

const [nextActionDate,setNextActionDate]=
useState(
  lead.next_action_date
    ? lead.next_action_date.slice(0, 10)
    : ""
)


const [notes,setNotes]=
useState(
 lead.notes ?? ""
)


const [source,setSource]=
useState<LeadSource>(
 lead.source ?? "other"
)


const [tags,setTags]=
useState(
 (lead.tags ?? []).join(", ")
)


const [saving,setSaving]=
useState(false)



const handleSave=async()=>{


const dealValue=
Number(value)



if(!name.trim()){

toast.error(
isDe
?"Name erforderlich"
:"Name required"
)

return

}



if(Number.isNaN(dealValue)){

toast.error(
isDe
?"Ungültiger Wert"
:"Invalid value"
)

return

}



setSaving(true)


try{


await saveLead(

lead.id,

lead.status,

{

name,

company,

status,

value:dealValue,

email,

phone,

website,

address,

next_action: nextAction || undefined,

next_action_date:
  nextActionDate || undefined,

notes,

source,

tags:
tags
.split(",")
.map(t=>t.trim())
.filter(Boolean)

}

)

await onSaved()



toast.success(
isDe
?"Lead gespeichert"
:"Lead saved"
)


}

catch(error){

console.error(error)

toast.error(
isDe
?"Speichern fehlgeschlagen"
:"Save failed"
)


}

finally{

setSaving(false)

}



}




return (

<div
id="lead-details"
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
{
isDe
?"Lead-Details"
:
"Lead Details"
}
</h2>



<div
className="
grid
gap-5
md:grid-cols-2
"
>


<Input
label={isDe?"Name":"Name"}
value={name}
setValue={setName}
/>


<Input
label={isDe?"Firma":"Company"}
value={company}
setValue={setCompany}
/>


<Input
label={
isDe
?"Deal-Wert"
:
"Deal Value"
}
value={value}
setValue={setValue}
/>



<div>

<label className="mb-2 block text-sm text-foreground/65">
{
isDe
?"Status"
:
"Status"
}
</label>


<select
value={status}
onChange={
e=>
setStatus(
e.target.value as LeadStatus
)
}
className="
w-full
rounded-xl
border
border-border-subtle
bg-surface-2
px-4
py-3
"
>

<option value="new">
New
</option>

<option value="contacted">
Contacted
</option>

<option value="proposal">
Proposal
</option>

<option value="won">
Won
</option>

<option value="lost">
Lost
</option>

</select>

</div>



<Input
label="Email"
value={email}
setValue={setEmail}
/>


<Input
label="Phone"
value={phone}
setValue={setPhone}
/>


<Input
label="Website"
value={website}
setValue={setWebsite}
/>



<div className="md:col-span-2">

<Input
label={
isDe
?"Adresse"
:
"Address"
}
value={address}
setValue={setAddress}
/>

</div>

<div className="grid gap-5 md:grid-cols-2">

  <Input
    label={
      isDe
        ? "Nächste Aktion"
        : "Next Action"
    }
    value={nextAction}
    setValue={setNextAction}
  />

  <div>
    <label className="mb-2 block text-sm text-foreground/65">
      {
        isDe
          ? "Fällig am"
          : "Due Date"
      }
    </label>

    <input
      type="date"
      value={nextActionDate}
      onChange={(e) =>
        setNextActionDate(e.target.value)
      }
      className="
        w-full
        rounded-xl
        border
        border-border-subtle
        bg-surface-2
        px-4
        py-3
        outline-none
      "
    />
  </div>

</div>



<div className="md:col-span-2">

<Input
label="Tags"
value={tags}
setValue={setTags}
/>

</div>



</div>



<div>

<label className="mb-2 block text-sm text-foreground/65">
{
isDe
?"Notizen"
:
"Notes"
}
</label>


<textarea

value={notes}

onChange={
e=>setNotes(e.target.value)
}

className="
h-40
w-full
rounded-xl
border
border-border-subtle
bg-surface-2
px-4
py-3
"

/>

</div>




<button

onClick={handleSave}

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
(isDe?"Änderungen speichern":"Save Changes")
}

</button>



</div>

)

}





function Input({
label,
value,
setValue
}:{
label:string
value:string
setValue:(v:string)=>void
}){


return (

<div>


<label className="
mb-2
block
text-sm
text-foreground/65
">

{label}

</label>



<input

value={value}

onChange={
e=>setValue(e.target.value)
}

className="
w-full
rounded-xl
border
border-border-subtle
bg-surface-2
px-4
py-3
outline-none
"

/>


</div>

)

}