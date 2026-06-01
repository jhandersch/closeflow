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
  const won = leads.filter((l) => l.status === "won").length
  const revenue = leads
    .filter((l) => l.status === "won")
    .reduce((sum, l) => sum + (l.value || 0), 0)

  const pipelineValue = leads.reduce(
    (sum, l) => sum + (l.value || 0),
    0
  )

  return (
    <AuthGuard>
      <div>
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

        <div className="grid grid-cols-4 gap-6">
          <div className="bg-[#111] p-6 rounded-xl">
            Total: {total}
          </div>

          <div className="bg-[#111] p-6 rounded-xl">
            Won: {won}
          </div>

          <div className="bg-[#111] p-6 rounded-xl">
            Revenue: €{revenue}
          </div>

          <div className="bg-[#111] p-6 rounded-xl">
            Pipeline: €{pipelineValue}
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}