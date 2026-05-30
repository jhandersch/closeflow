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

  const total = leads.length
  const won = leads.filter(l => l.status === "won").length
  const lost = leads.filter(l => l.status === "lost").length

  if (loading) {
    return (
      <div className="text-white flex items-center justify-center min-h-screen">
        Loading dashboard...
      </div>
    )
  }

  return (
    <div className="text-white">
      <h1 className="text-3xl font-bold mb-8">
        Dashboard
      </h1>

      <div className="grid grid-cols-3 gap-6">
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
      </div>
    </div>
  )
}