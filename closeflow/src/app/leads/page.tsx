"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Sidebar from "@/components/Sidebar"

type Lead = {
  id: string
  name: string
  company: string
  status: string
}

export default function LeadsPage() {
  const router = useRouter()

  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
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

    load()
  }, [])

  const getScore = (lead: Lead) => {
    let score = 0

    if (lead.name) score += 30
    if (lead.company) score += 30

    if (lead.status === "won") score += 40
    if (lead.status === "new") score += 25
    if (lead.status === "contacted") score += 10

    return score
  }

  const getInsight = (lead: Lead) => {
    if (lead.status === "won") {
      return "Already converted → high value customer"
    }
    if (!lead.company) {
      return "Missing company → low quality lead"
    }
    if (lead.status === "new") {
      return "New lead → needs first contact"
    }
    return "Standard lead → monitor progress"
  }

  const getLabel = (score: number) => {
    if (score >= 70) return { label: "Hot", color: "text-red-400" }
    if (score >= 40) return { label: "Warm", color: "text-yellow-400" }
    return { label: "Cold", color: "text-blue-400" }
  }

  const filtered = leads.filter((l) =>
    `${l.name} ${l.company}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading...
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-black text-white">
      <Sidebar />

      <div className="flex-1 p-10">

        <h1 className="text-3xl font-bold mb-6">
          AI Leads
        </h1>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search leads..."
          className="mb-6 bg-[#111] border border-white/10 px-4 py-2 rounded-xl"
        />

        <div className="space-y-4">

          {filtered.map((lead) => {
            const score = getScore(lead)
            const label = getLabel(score)

            return (
              <div
                key={lead.id}
                className="bg-[#111] p-4 rounded-xl cursor-pointer"
                onClick={() =>
                  router.push(`/leads/${lead.id}`)
                }
              >
                <div className="flex justify-between items-start">

                  <div>
                    <p className="font-medium">
                      {lead.name}
                    </p>
                    <p className="text-sm text-zinc-400">
                      {lead.company}
                    </p>

                    <p className="text-xs text-zinc-500 mt-2">
                      {getInsight(lead)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className={label.color}>
                      {label.label}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Score {score}
                    </p>
                  </div>

                </div>
              </div>
            )
          })}

        </div>

      </div>
    </div>
  )
}