"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type Lead = {
  id: string
  name: string
  company: string
  status: string
  value: number
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user

    if (!user) return

    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("user_id", user.id)

    setLeads(data || [])
    setLoading(false)
  }

  if (loading) return <div className="text-white">Loading...</div>

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Leads</h1>

      <div className="space-y-3">
        {leads.map((lead) => (
          <div key={lead.id} className="bg-[#111] p-4 rounded-xl">
            <p>{lead.name}</p>
            <p className="text-sm text-zinc-400">{lead.company}</p>
            <p className="text-xs text-zinc-500">
              €{lead.value} • {lead.status}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}