"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type Lead = {
  id: string
  name: string
  company: string
  status: string
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

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
    if (lead.status === "new") score += 20
    if (lead.status === "contacted") score += 10

    return score
  }

  const total = leads.length
  const won = leads.filter(l => l.status === "won").length
  const lost = leads.filter(l => l.status === "lost").length

  const hot = leads.filter(l => getScore(l) >= 70).length
  const warm = leads.filter(l => getScore(l) >= 40 && getScore(l) < 70).length
  const cold = leads.filter(l => getScore(l) < 40).length

  const avgScore =
    leads.length === 0
      ? 0
      : leads.reduce((acc, l) => acc + getScore(l), 0) /
        leads.length

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading dashboard...
      </div>
    )
  }

  return (
    <div className="flex-1 p-10 text-white">

      <h1 className="text-3xl font-bold mb-8">
        Dashboard
      </h1>

      {/* MAIN KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">

        <div className="bg-[#111] p-6 rounded-2xl">
          <p className="text-zinc-400">Total Leads</p>
          <p className="text-3xl font-bold">{total}</p>
        </div>

        <div className="bg-[#111] p-6 rounded-2xl">
          <p className="text-zinc-400">Won</p>
          <p className="text-3xl font-bold text-green-400">
            {won}
          </p>
        </div>

        <div className="bg-[#111] p-6 rounded-2xl">
          <p className="text-zinc-400">Lost</p>
          <p className="text-3xl font-bold text-red-400">
            {lost}
          </p>
        </div>

        <div className="bg-[#111] p-6 rounded-2xl">
          <p className="text-zinc-400">Avg Score</p>
          <p className="text-3xl font-bold text-blue-400">
            {avgScore.toFixed(1)}
          </p>
        </div>

      </div>

      {/* AI INSIGHTS */}
      <div className="grid grid-cols-3 gap-6 mt-10">

        <div className="bg-[#111] p-6 rounded-2xl">
          <p className="text-red-400 font-bold text-xl">
            Hot Leads
          </p>
          <p className="text-3xl mt-2">{hot}</p>
        </div>

        <div className="bg-[#111] p-6 rounded-2xl">
          <p className="text-yellow-400 font-bold text-xl">
            Warm Leads
          </p>
          <p className="text-3xl mt-2">{warm}</p>
        </div>

        <div className="bg-[#111] p-6 rounded-2xl">
          <p className="text-blue-400 font-bold text-xl">
            Cold Leads
          </p>
          <p className="text-3xl mt-2">{cold}</p>
        </div>

      </div>

      {/* INSIGHT TEXT */}
      <div className="mt-10 bg-[#111] p-6 rounded-2xl">
        <h2 className="text-xl font-semibold mb-2">
          AI Insight
        </h2>

        <p className="text-zinc-400">
          {hot > 0
            ? `You have ${hot} hot leads. Focus on closing them first.`
            : "No hot leads yet. Improve lead quality or outreach."}
        </p>
      </div>

    </div>
  )
}