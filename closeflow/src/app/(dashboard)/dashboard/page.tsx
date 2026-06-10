"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import AuthGuard from "@/components/AuthGuard"

type Lead = {
  id: string
  name: string
  company: string
  status: string
  value: number
}

const stageWeights: Record<string, number> = {
  new: 0.1,
  contacted: 0.3,
  proposal: 0.7,
  won: 1,
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user

    if (!user) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("user_id", user.id)

    setLeads(data || [])
    setLoading(false)
  }

  const total = leads.length

  const won = leads.filter((l) => l.status === "won").length

  const revenue = leads
    .filter((l) => l.status === "won")
    .reduce((sum, l) => sum + (l.value || 0), 0)

  const pipelineValue = leads.reduce(
    (sum, l) => sum + (l.value || 0),
    0
  )

  const forecast = leads.reduce((sum, l) => {
    const weight = stageWeights[l.status] || 0
    return sum + (l.value || 0) * weight
  }, 0)

  const topLeads = [...leads]
    .sort((a, b) => (b.value || 0) - (a.value || 0))
    .slice(0, 3)

  const recentLeads = [...leads]
    .slice(-5)
    .reverse()

  return (
    <AuthGuard>
      <div>
        <h1 className="text-3xl font-bold mb-8">
          Dashboard
        </h1>

        {/* KPI Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-10">

          <div className="bg-[#111] p-6 rounded-xl">
            <p className="text-zinc-400 text-sm">Total Leads</p>
            <h2 className="text-3xl font-bold mt-2">{total}</h2>
          </div>

          <div className="bg-[#111] p-6 rounded-xl">
            <p className="text-zinc-400 text-sm">Won Deals</p>
            <h2 className="text-3xl font-bold mt-2">{won}</h2>
          </div>

          <div className="bg-[#111] p-6 rounded-xl">
            <p className="text-zinc-400 text-sm">Revenue</p>
            <h2 className="text-3xl font-bold mt-2">€{revenue}</h2>
          </div>

          <div className="bg-[#111] p-6 rounded-xl">
            <p className="text-zinc-400 text-sm">Pipeline Value</p>
            <h2 className="text-3xl font-bold mt-2">€{pipelineValue}</h2>
          </div>

        </div>

        {/* Forecast */}
        <div className="bg-[#111] p-6 rounded-xl mb-10">
          <p className="text-zinc-400 text-sm">Forecast Revenue</p>
          <h2 className="text-3xl font-bold mt-2 text-green-400">
            €{Math.round(forecast)}
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">

          {/* Top Leads */}
          <div className="bg-[#111] p-6 rounded-xl">
            <h2 className="text-lg font-semibold mb-4">
              Top Leads
            </h2>

            <div className="space-y-3">
              {topLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex justify-between text-sm"
                >
                  <span>{lead.name}</span>
                  <span className="text-green-400">
                    €{lead.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-[#111] p-6 rounded-xl">
            <h2 className="text-lg font-semibold mb-4">
              Recent Leads
            </h2>

            <div className="space-y-3">
              {recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="text-sm border-b border-white/10 pb-2"
                >
                  <p className="font-medium">{lead.name}</p>
                  <p className="text-zinc-500 text-xs">
                    {lead.company} • {lead.status}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </AuthGuard>
  )
}