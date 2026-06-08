"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
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

  const [showForm, setShowForm] = useState(false)

  const [name, setName] = useState("")
  const [company, setCompany] = useState("")
  const [value, setValue] = useState("")
  const [status, setStatus] = useState("new")

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

  const createLead = async () => {
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user

    if (!user) return

    const { data: leadData, error } = await supabase
      .from("leads")
      .insert([
        {
          user_id: user.id,
          name,
          company,
          status,
          value: Number(value),
        },
      ])
      .select()
      .single()

    if (error) {
      alert(error.message)
      return
    }

    await supabase.from("activities").insert([
      {
        lead_id: leadData.id,
        user_id: user.id,
        action: "Lead created",
      },
    ])

    setName("")
    setCompany("")
    setValue("")
    setStatus("new")
    setShowForm(false)

    load()
  }

  const getLeadScore = (lead: Lead) => {
    if (lead.status === "won" || lead.value >= 5000) {
      return {
        label: "🔥 Hot",
        color: "text-red-400",
      }
    }

    if (lead.status === "proposal" || lead.value >= 1000) {
      return {
        label: "🟡 Warm",
        color: "text-yellow-400",
      }
    }

    return {
      label: "🔵 Cold",
      color: "text-blue-400",
    }
  }

  if (loading) {
    return <div className="text-white">Loading...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Leads</h1>

        <button
          onClick={() => setShowForm(true)}
          className="bg-white text-black px-4 py-2 rounded-xl"
        >
          + Add Lead
        </button>
      </div>

      {showForm && (
        <div className="bg-[#111] p-6 rounded-xl mb-6 space-y-4">

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="w-full bg-black border border-white/10 rounded-xl px-4 py-2"
          />

          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company"
            className="w-full bg-black border border-white/10 rounded-xl px-4 py-2"
          />

          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Value"
            type="number"
            className="w-full bg-black border border-white/10 rounded-xl px-4 py-2"
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-black border border-white/10 rounded-xl px-4 py-2"
          >
            <option value="new">new</option>
            <option value="contacted">contacted</option>
            <option value="proposal">proposal</option>
            <option value="won">won</option>
          </select>

          <div className="flex gap-3">
            <button
              onClick={createLead}
              className="bg-white text-black px-4 py-2 rounded-xl"
            >
              Create
            </button>

            <button
              onClick={() => setShowForm(false)}
              className="bg-black border border-white/10 px-4 py-2 rounded-xl"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {leads.map((lead) => {
          const score = getLeadScore(lead)

          return (
            <Link
              key={lead.id}
              href={`/leads/${lead.id}`}
              className="block bg-[#111] p-4 rounded-xl hover:bg-white/5 transition"
            >
              <div className="flex justify-between items-start">

                <div>
                  <p className="font-medium">{lead.name}</p>

                  <p className="text-sm text-zinc-400">
                    {lead.company}
                  </p>

                  <p className="text-xs text-zinc-500">
                    €{lead.value} • {lead.status}
                  </p>
                </div>

                <span className={`font-semibold ${score.color}`}>
                  {score.label}
                </span>

              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}