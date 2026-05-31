"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

type Lead = {
  id: string
  name: string
  company: string
  status: string
  notes?: string
}

export default function LeadDetailPage() {
  const { id } = useParams()

  const [lead, setLead] = useState<Lead | null>(null)
  const [notes, setNotes] = useState("")

  useEffect(() => {
    load()
  }, [id])

  const load = async () => {
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .single()

    setLead(data)
    setNotes(data?.notes || "")
  }

  const save = async () => {
    await supabase
      .from("leads")
      .update({ notes })
      .eq("id", id)
  }

  if (!lead) return <div className="text-white">Loading...</div>

  return (
    <div>

      <h1 className="text-4xl font-bold">{lead.name}</h1>
      <p className="text-zinc-400">{lead.company}</p>

      <div className="mt-6">
        <textarea
          className="w-full h-40 bg-black border border-white/10 p-3"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <button
          onClick={save}
          className="mt-3 bg-white text-black px-4 py-2 rounded"
        >
          Save
        </button>
      </div>

    </div>
  )
}