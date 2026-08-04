"use client"

import Link from "next/link"

import {
 leadDisplayName,
 leadCompany
} from "@/lib/utils"


import type { Lead } from "@/types"


type Props = {
 lead: Lead
 isDe:boolean
 onDelete:()=>void
}


export default function LeadHeader({
 lead,
 isDe,
 onDelete
}:Props){


 return (

<div
className="
flex
flex-col
gap-4
rounded-2xl
border
border-border-subtle
bg-surface-1
p-6
xl:flex-row
xl:items-start
xl:justify-between
"
>


<div>

<h1
className="
text-3xl
font-bold
text-foreground
"
>
{leadDisplayName(lead)}
</h1>


<p className="
mt-1
text-foreground/65
">
{leadCompany(lead)}
</p>


<p className="
mt-2
text-sm
text-foreground/65
">
Deal:
{" "}
EUR
{" "}
{(lead.value ?? 0).toLocaleString()}
</p>


</div>



<div className="
flex
flex-wrap
gap-3
items-center
">


<a
href="#lead-details"
className="
rounded-xl
border
border-border-subtle
px-4
py-2
text-sm
font-semibold
"
>
{isDe?"Bearbeiten":"Edit"}
</a>



{
lead.email && (

<Link
href={`/ai?leadId=${lead.id}`}
className="
rounded-full
border
border-cyan-500/30
bg-cyan-500/10
px-4
py-2
text-sm
font-semibold
text-cyan-300
"
>
AI
</Link>

)
}



<button
onClick={onDelete}
className="
rounded-xl
border
border-rose-500/30
bg-rose-500/10
px-4
py-2
text-sm
font-semibold
text-rose-300
"
>
{isDe?"Löschen":"Delete"}
</button>



<span
className="
rounded-full
bg-green-500/20
px-4
py-2
text-sm
font-medium
text-green-300
"
>
{lead.status.toUpperCase()}
</span>



</div>


</div>


 )

}