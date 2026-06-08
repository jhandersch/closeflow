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

  if (loading) {
    return (
      <AuthGuard>
        <div className="text-white">Loading...</div>
      </AuthGuard>
    )
  }

  const total = leads.length

  const won = leads.filter(
    (l) => l.status === "won"
  ).length

  const revenue = leads
    .filter((l) => l.status === "won")
    .reduce(
      (sum, l) => sum + (l.value || 0),
      0
    )

  const pipelineValue = leads.reduce(
    (sum, l) => sum + (l.value || 0),
    0
  )

  const averageDealSize =
    total > 0
      ? Math.round(
          pipelineValue / total
        )
      : 0

  const conversionRate =
    total > 0
      ? (
          (won / total) *
          100
        ).toFixed(1)
      : "0"

  const forecastRevenue = Math.round(
    leads.reduce((sum, lead) => {
      let probability = 0

      if (lead.status === "won") {
        probability = 1
      } else if (lead.status === "proposal") {
        probability = 0.7
      } else if (lead.status === "contacted") {
        probability = 0.4
      } else {
        probability = 0.15
      }

      return sum + lead.value * probability
    }, 0)
  )

  return (
    <AuthGuard>
      <div>

        <h1 className="text-3xl font-bold mb-8">
          Dashboard
        </h1>

        <div className="grid md:grid-cols-3 gap-6">

          <div className="bg-[#111] p-6 rounded-xl">
            <p className="text-zinc-400 text-sm">
              Total Leads
            </p>

            <h2 className="text-3xl font-bold mt-2">
              {total}
            </h2>
          </div>

          <div className="bg-[#111] p-6 rounded-xl">
            <p className="text-zinc-400 text-sm">
              Won Deals
            </p>

            <h2 className="text-3xl font-bold mt-2">
              {won}
            </h2>
          </div>

          <div className="bg-[#111] p-6 rounded-xl">
            <p className="text-zinc-400 text-sm">
              Revenue
            </p>

            <h2 className="text-3xl font-bold mt-2">
              €{revenue}
            </h2>
          </div>

          <div className="bg-[#111] p-6 rounded-xl">
            <p className="text-zinc-400 text-sm">
              Pipeline Value
            </p>

            <h2 className="text-3xl font-bold mt-2">
              €{pipelineValue}
            </h2>
          </div>

          <div className="bg-[#111] p-6 rounded-xl">
            <p className="text-zinc-400 text-sm">
              Average Deal Size
            </p>

            <h2 className="text-3xl font-bold mt-2">
              €{averageDealSize}
            </h2>
          </div>

          <div className="bg-[#111] p-6 rounded-xl">
            <p className="text-zinc-400 text-sm">
              Conversion Rate
            </p>

            <h2 className="text-3xl font-bold mt-2">
              {conversionRate}%
            </h2>
          </div>

          <div className="bg-[#111] p-6 rounded-xl md:col-span-3">
            <p className="text-zinc-400 text-sm">
              Forecast Revenue
            </p>

            <h2 className="text-4xl font-bold mt-2 text-green-400">
              €{forecastRevenue}
            </h2>

            <p className="text-zinc-500 mt-2 text-sm">
              Expected revenue based on pipeline probabilities.
            </p>
          </div>

        </div>

      </div>
    </AuthGuard>
  )
}
