"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

type Lead = {
  id: string
  name: string
  company: string
  status: string
  user_id: string
}

export default function DashboardPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: userData } =
        await supabase.auth.getUser()

      const user = userData.user

      if (!user) {
        router.push("/login")
        return
      }

      setEmail(user.email || "")

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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const recentLeads = leads.slice(0, 5)

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
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        Loading dashboard...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-8 py-10">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">
              Dashboard
            </h1>

            <p className="text-zinc-500 mt-2">
              Welcome back to CloseFlow
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              <p className="text-sm text-zinc-500">
                Logged in as
              </p>

              <p className="text-sm text-zinc-300">
                {email}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="bg-white/10 hover:bg-white/15 transition border border-white/10 px-5 py-2.5 rounded-2xl text-sm"
            >
              Logout
            </button>
          </div>
        </div>

        {/* HERO */}
        <div className="bg-gradient-to-br from-[#181818] to-[#101010] border border-white/5 rounded-3xl p-8 mb-8">
          <div className="max-w-2xl">
            <p className="text-sm text-zinc-500 mb-4">
              AI-Powered CRM
            </p>

            <h2 className="text-4xl font-bold leading-tight mb-4">
              Manage leads and grow your sales pipeline.
            </h2>

            <p className="text-zinc-400 text-lg mb-6">
              Track prospects, manage deals and organize your workflow inside one modern CRM dashboard.
            </p>

            <Link
              href="/pipeline"
              className="inline-flex items-center bg-white text-black px-6 py-3 rounded-2xl font-medium hover:scale-[1.02] transition"
            >
              Open Pipeline
            </Link>
          </div>
        </div>

        {/* STATS */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">

          <div className="bg-[#111111] border border-white/5 rounded-3xl p-6">
            <p className="text-zinc-500 text-sm mb-3">
              Total Leads
            </p>

            <h3 className="text-5xl font-bold tracking-tight">
              {leads.length}
            </h3>
          </div>

          <div className="bg-[#111111] border border-white/5 rounded-3xl p-6">
            <p className="text-zinc-500 text-sm mb-3">
              New Leads
            </p>

            <h3 className="text-5xl font-bold tracking-tight">
              {newLeads.length}
            </h3>
          </div>

          <div className="bg-[#111111] border border-white/5 rounded-3xl p-6">
            <p className="text-zinc-500 text-sm mb-3">
              Won Deals
            </p>

            <h3 className="text-5xl font-bold tracking-tight">
              {wonLeads.length}
            </h3>
          </div>

          <div className="bg-[#111111] border border-white/5 rounded-3xl p-6">
            <p className="text-zinc-500 text-sm mb-3">
              Lost Deals
            </p>

            <h3 className="text-5xl font-bold tracking-tight">
              {lostLeads.length}
            </h3>
          </div>

        </div>

        {/* QUICK ACTIONS + RECENT LEADS */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* QUICK ACTIONS */}
          <div className="bg-[#111111] border border-white/5 rounded-3xl p-6">
            <h2 className="text-xl font-semibold mb-6">
              Quick Actions
            </h2>

            <div className="space-y-4">

              <Link
                href="/pipeline"
                className="block bg-[#1a1a1a] hover:bg-[#202020] border border-white/5 rounded-2xl p-4 transition"
              >
                <p className="font-medium">
                  Open Pipeline
                </p>

                <p className="text-sm text-zinc-500 mt-1">
                  Manage all leads and deals
                </p>
              </Link>

              <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-4 opacity-60">
                <p className="font-medium">
                  Leads Page
                </p>

                <p className="text-sm text-zinc-500 mt-1">
                  Coming soon
                </p>
              </div>

              <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-4 opacity-60">
                <p className="font-medium">
                  AI Insights
                </p>

                <p className="text-sm text-zinc-500 mt-1">
                  Coming soon
                </p>
              </div>

            </div>
          </div>

          {/* RECENT LEADS */}
          <div className="lg:col-span-2 bg-[#111111] border border-white/5 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">
                Recent Leads
              </h2>

              <Link
                href="/pipeline"
                className="text-sm text-zinc-400 hover:text-white transition"
              >
                View all
              </Link>
            </div>

            {recentLeads.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-zinc-500">
                  No leads yet
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">
                        {lead.name}
                      </p>

                      <p className="text-sm text-zinc-500 mt-1">
                        {lead.company}
                      </p>
                    </div>

                    <div
                      className={`
                        text-sm px-3 py-1 rounded-full
                        ${
                          lead.status === "won"
                            ? "bg-green-500/10 text-green-400"
                            : lead.status === "lost"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-blue-500/10 text-blue-400"
                        }
                      `}
                    >
                      {lead.status}
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  )
}