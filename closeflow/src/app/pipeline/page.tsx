"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

type Lead = {
  id: string
  name: string
  company: string
  status: string
  user_id: string
}

export default function PipelinePage() {
  const router = useRouter()

  const [userId, setUserId] = useState("")
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: userData } = await supabase.auth.getUser()
      const user = userData.user

      if (!user) {
        router.push("/login")
        return
      }

      setUserId(user.id)

      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        console.log(error)
      }

      setLeads(data || [])
      setLoading(false)
    }

    init()
  }, [router])

  const updateStatus = async (
    id: string,
    newStatus: string
  ) => {
    const { error } = await supabase
      .from("leads")
      .update({
        status: newStatus,
      })
      .eq("id", id)

    if (!error) {
      setLeads(
        leads.map((lead) =>
          lead.id === id
            ? { ...lead, status: newStatus }
            : lead
        )
      )
    }
  }

  const deleteLead = async (id: string) => {
    const { error } = await supabase
      .from("leads")
      .delete()
      .eq("id", id)

    if (!error) {
      setLeads(
        leads.filter((lead) => lead.id !== id)
      )
    }
  }

  const newLeads = leads.filter(
    (lead) => lead.status === "new"
  )

  const wonLeads = leads.filter(
    (lead) => lead.status === "won"
  )

  const lostLeads = leads.filter(
    (lead) => lead.status === "lost"
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">
        Loading pipeline...
      </div>
    )
  }

  const renderLeadCard = (lead: Lead) => (
    <div
      key={lead.id}
      className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-4 hover:border-white/10 transition"
    >
      <div className="mb-4">
        <p className="font-medium text-white">
          {lead.name}
        </p>

        <p className="text-sm text-zinc-500 mt-1">
          {lead.company}
        </p>
      </div>

      <div className="space-y-3">
        <select
          value={lead.status}
          onChange={(e) =>
            updateStatus(lead.id, e.target.value)
          }
          className="w-full bg-[#111111] border border-white/10 rounded-xl px-3 py-2 text-sm"
        >
          <option value="new">New</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>

        <button
          onClick={() => deleteLead(lead.id)}
          className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 px-4 py-2 rounded-xl text-sm transition"
        >
          Delete
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-8 py-10">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight">
            Pipeline
          </h1>

          <p className="text-zinc-500 mt-2">
            Manage your sales workflow
          </p>
        </div>

        {/* PIPELINE */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* NEW */}
          <div className="bg-[#111111] border border-white/5 rounded-3xl p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-lg">
                New
              </h2>

              <div className="bg-blue-500/10 text-blue-400 text-sm px-3 py-1 rounded-full">
                {newLeads.length}
              </div>
            </div>

            <div className="space-y-4">
              {newLeads.map(renderLeadCard)}
            </div>
          </div>

          {/* WON */}
          <div className="bg-[#111111] border border-white/5 rounded-3xl p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-lg">
                Won
              </h2>

              <div className="bg-green-500/10 text-green-400 text-sm px-3 py-1 rounded-full">
                {wonLeads.length}
              </div>
            </div>

            <div className="space-y-4">
              {wonLeads.map(renderLeadCard)}
            </div>
          </div>

          {/* LOST */}
          <div className="bg-[#111111] border border-white/5 rounded-3xl p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-lg">
                Lost
              </h2>

              <div className="bg-red-500/10 text-red-400 text-sm px-3 py-1 rounded-full">
                {lostLeads.length}
              </div>
            </div>

            <div className="space-y-4">
              {lostLeads.map(renderLeadCard)}
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}