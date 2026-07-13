import Link from "next/link"
import { leadDisplayName, leadCompany } from "@/lib/utils"

type Lead = {
  id: string
  name: string
  company: string
  status: string
  value: number
}


const stages = [
  {
    id: "new",
    label: "New"
  },
  {
    id: "contacted",
    label: "Contacted"
  },
  {
    id: "proposal",
    label: "Proposal"
  },
  {
    id: "won",
    label: "Won"
  }
]


export default function LeadPipeline({
  leads
}: {
  leads: Lead[]
}) {

return (

<div className="grid gap-4 md:grid-cols-4">

{
stages.map(stage => (

<div
key={stage.id}
className="rounded-2xl bg-surface-1 p-4 border border-border-subtle"
>

<h3 className="font-semibold mb-4">
{stage.label}
</h3>


<div className="space-y-3">

{
leads
.filter(
lead => lead.status === stage.id
)
.map(lead => (

<Link
key={lead.id}
href={`/leads/${lead.id}`}
className="block rounded-xl bg-surface-2/80 p-3 hover:bg-white/5"
>

<p className="font-medium">
{leadDisplayName(lead)}
</p>

<p className="text-sm text-foreground/65">
{leadCompany(lead)}
</p>

<p className="text-xs text-green-400 mt-2">
â‚¬{lead.value.toLocaleString("de-DE")}
</p>

</Link>

))

}

</div>

</div>

))

}

</div>

)

}
