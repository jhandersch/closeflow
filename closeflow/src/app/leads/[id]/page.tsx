"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Sidebar from "@/components/Sidebar"

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
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState("")

  useEffect(() => {
    const loadLead = async () => {
      const { data } = await supabase
        .from("leads")
        .select("*")
        .eq("id", id)
        .single()

      setLead(data)
      setNotes(data?.notes || "")
      setLoading(false)
    }

    if (id) loadLead()
  }, [id])

  const saveNotes = async () => {
    if (!lead) return

    await supabase
      .from("leads")
      .update({ notes })
      .eq("id", lead.id)

    alert("Notes saved")
  }

  if (loading) {
    return (
      <div className="text-white p-10">
        Loading lead...
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="text-white p-10">
        Lead not found
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-white">
      <Sidebar />

      <div className="flex-1 p-10 max-w-3xl">

        <h1 className="text-4xl font-bold mb-2">
          {lead.name}
        </h1>

        <p className="text-zinc-400 mb-6">
          {lead.company}
        </p>

        <div className="mb-6">
          <span className="px-3 py-1 rounded-full bg-white/10">
            {lead.status}
          </span>
        </div>

        {/* NOTES */}
        <div className="bg-[#111] p-6 rounded-2xl">
          <h2 className="text-xl font-semibold mb-4">
            Notes
          </h2>

          <textarea
            value={notes}
            onChange={(e) =>
              setNotes(e.target.value)
            }
            className="w-full h-40 bg-black border border-white/10 rounded-xl p-3"
          />

          <button
            onClick={saveNotes}
            className="mt-4 bg-white text-black px-4 py-2 rounded-xl"
          >
            Save Notes
          </button>
        </div>

      </div>
    </div>
  )
}