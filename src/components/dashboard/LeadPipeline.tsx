"use client"

import Link from "next/link"
import { useAppPreferences } from "@/components/AppPreferencesProvider"
import { leadDisplayName, leadCompany } from "@/lib/utils"

type Lead = {
  id: string
  name: string
  company: string
  status: string
  value: number
}


export default function LeadPipeline({
  leads
}: {
  leads: Lead[]
}) {
const { language } = useAppPreferences()
const isDe = language === "de"

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    new: isDe ? "Neu" : "New",
    contacted: isDe ? "Kontaktiert" : "Contacted",
    qualified: isDe ? "Qualifiziert" : "Qualified",
    proposal: isDe ? "Angebot" : "Proposal",
    won: isDe ? "Gewonnen" : "Won",
    lost: isDe ? "Verloren" : "Lost",
  }

  return labels[status] ?? status
}

const stages = [
  { id: "new", label: isDe ? "Neu" : "New" },
  { id: "contacted", label: isDe ? "Kontaktiert" : "Contacted" },
  { id: "qualified", label: isDe ? "Qualifiziert" : "Qualified" },
  { id: "proposal", label: isDe ? "Angebot" : "Proposal" },
  { id: "won", label: isDe ? "Gewonnen" : "Won" },
  { id: "lost", label: isDe ? "Verloren" : "Lost" },
]

return (

<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">

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
€{lead.value.toLocaleString("de-DE")}
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
