"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import AuthGuard from "@/components/AuthGuard"

import {
  BarChart,
  Bar,
 XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"

type Lead = {
  id: string
  name: string
  company: string
  status: string
  value: number
}

type Activity = {
  id: string
  action: string
  type?: string
  created_at: string
}

const stageWeights: Record<string, number> = {
  new: 0.1,
  contacted: 0.3,
  proposal: 0.7,
  won: 1,
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
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

    const { data: activityData } = await supabase
      .from("activities")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)

    setLeads(data || [])
    setActivities(activityData || [])
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
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  const proposalLeads = leads.filter(
    (l) => l.status === "proposal"
  )

  const proposalValue = proposalLeads.reduce(
    (sum, l) => sum + (l.value || 0),
    0
  )

  const highValueDeals = leads.filter(
    (l) => (l.value || 0) >= 5000
  )

  const staleContactedDeals = leads.filter(
    (l) => l.status === "contacted"
  )

  const urgentProposalDeals = leads.filter(
    (l) => l.status === "proposal"
  )

  const chartData = [
    {
      status: "new",
      value: leads.filter((l) => l.status === "new").length,
    },
    {
      status: "contacted",
      value: leads.filter((l) => l.status === "contacted").length,
    },
    {
      status: "proposal",
      value: leads.filter((l) => l.status === "proposal").length,
    },
    {
      status: "won",
      value: leads.filter((l) => l.status === "won").length,
    },
  ]

  const COLORS = [
    "#3b82f6",
    "#eab308",
    "#f97316",
    "#22c55e",
  ]

  const revenueData = [
    { month: "Jan", revenue: 2000 },
    { month: "Feb", revenue: 4500 },
    { month: "Mar", revenue: 7000 },
    { month: "Apr", revenue: 9000 },
    { month: "May", revenue: 12000 },
  ]

  let recommendation = "Focus on growing your pipeline."

  if (proposalLeads.length > 0) {
    recommendation = "Schedule closing calls this week."
  }

  const getHealth = (lead: Lead) => {
    let score = 0

    if (lead.status === "proposal") score += 50
    if (lead.status === "won") score += 20
    if ((lead.value || 0) >= 5000) score += 30

    if (score >= 70) {
      return {
        label: "Healthy",
        color: "text-green-400",
      }
    }

    if (score >= 40) {
      return {
        label: "Medium",
        color: "text-yellow-400",
      }
    }

    return {
      label: "At Risk",
      color: "text-red-400",
    }
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="text-white">Loading...</div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div>
        <h1 className="text-3xl font-bold mb-8">
          Dashboard
        </h1>
        {/* KPI GRID */}
<div className="grid md:grid-cols-4 gap-6 mb-10">

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
      Forecast Revenue
    </p>

    <h2 className="text-3xl font-bold mt-2 text-green-400">
      €{Math.round(forecast)}
    </h2>
  </div>

</div>


{/* AI INSIGHT */}
<div className="bg-[#111] border border-white/10 p-6 rounded-xl mb-10">

  <p className="text-zinc-400 text-sm mb-2">
    AI Insight
  </p>

  <h2 className="text-xl font-semibold">
    {proposalLeads.length} leads are currently in proposal stage.
  </h2>

  <p className="text-zinc-500 mt-3">
    Potential revenue: €{proposalValue}
  </p>

  <p className="text-green-400 mt-4">
    Recommended action: {recommendation}
  </p>

</div>


{/* NOTIFICATIONS */}
<div className="bg-[#111] p-6 rounded-xl mb-10">

  <h2 className="text-lg font-semibold mb-4">
    Notifications
  </h2>

  <div className="space-y-3">

    {proposalLeads.length > 0 && (
      <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-xl">
        ⚠️ {proposalLeads.length} deals are currently waiting in proposal stage.
      </div>
    )}

    {forecast > revenue && (
      <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-xl">
        📈 Forecast revenue is higher than current revenue.
      </div>
    )}

    {won > 0 && (
      <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl">
        🎉 {won} deals have already been won.
      </div>
    )}

    {highValueDeals.length > 0 && (
      <div className="bg-purple-500/10 border border-purple-500/20 p-3 rounded-xl">
        💰 {highValueDeals.length} high-value deals above €5000 detected.
      </div>
    )}

    {urgentProposalDeals.length > 0 && (
      <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl">
        📞 {urgentProposalDeals.length} deals are ready for closing.
      </div>
    )}

    {staleContactedDeals.length > 3 && (
      <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
        ⏳ Several contacted deals require follow-up.
      </div>
    )}

    {total === 0 && (
      <div className="bg-zinc-500/10 border border-zinc-500/20 p-3 rounded-xl">
        No leads available yet.
      </div>
    )}

  </div>

</div>

{/* CHARTS */}
<div className="grid md:grid-cols-2 gap-6 mb-10">

  {/* LEADS BY STATUS */}
  <div className="bg-[#111] p-6 rounded-xl">

    <h2 className="text-lg font-semibold mb-4">
      Leads by Status
    </h2>

    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={chartData}>
        <XAxis dataKey="status" stroke="#aaa" />
        <YAxis stroke="#aaa" />
        <Tooltip />

        <Bar
          dataKey="value"
          fill="#3b82f6"
        />
      </BarChart>
    </ResponsiveContainer>

  </div>


  {/* PIPELINE DISTRIBUTION */}
  <div className="bg-[#111] p-6 rounded-xl">

    <h2 className="text-lg font-semibold mb-4">
      Pipeline Distribution
    </h2>

    <ResponsiveContainer width="100%" height={250}>
      <PieChart>

        <Pie
          data={chartData}
          dataKey="value"
          nameKey="status"
          cx="50%"
          cy="50%"
          outerRadius={80}
        >
          {chartData.map((_, index) => (
            <Cell
              key={index}
              fill={COLORS[index]}
            />
          ))}
        </Pie>

        <Tooltip />

      </PieChart>
    </ResponsiveContainer>

  </div>

</div>


{/* REVENUE TREND */}
<div className="bg-[#111] p-6 rounded-xl mb-10">

  <h2 className="text-lg font-semibold mb-4">
    Revenue Trend
  </h2>

  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={revenueData}>

      <XAxis
        dataKey="month"
        stroke="#aaa"
      />

      <YAxis stroke="#aaa" />

      <Tooltip />

      <Line
        type="monotone"
        dataKey="revenue"
        stroke="#22c55e"
        strokeWidth={3}
      />

    </LineChart>
  </ResponsiveContainer>

</div>
{/* AI RECOMMENDATIONS */}
<div className="bg-[#111] p-6 rounded-xl mb-10">

  <h2 className="text-lg font-semibold mb-4">
    AI Recommendations
  </h2>

  <div className="space-y-3">

    {proposalLeads.length > 0 && (
      <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-xl">
        Focus on proposal stage deals to maximize conversions.
      </div>
    )}

    {highValueDeals.length > 0 && (
      <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl">
        Prioritize high-value opportunities above €5000.
      </div>
    )}

    {staleContactedDeals.length > 0 && (
      <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl">
        Follow up contacted leads this week.
      </div>
    )}

  </div>

</div>


{/* BOTTOM GRID */}
<div className="grid md:grid-cols-2 gap-6">

  {/* TOP LEADS */}
  <div className="bg-[#111] p-6 rounded-xl">

    <h2 className="text-lg font-semibold mb-4">
      Top Leads
    </h2>

    <div className="space-y-4">

      {topLeads.map((lead) => {
        const health = getHealth(lead)


        return (
          <div
            key={lead.id}
            className="flex justify-between items-center border-b border-white/10 pb-3"
          >

            <div>
              <p className="font-medium">
                {lead.name}
              </p>

              <p className="text-sm text-zinc-500">
                {lead.company}
              </p>
            </div>

            <div className="text-right">

              <p className="text-green-400 font-semibold">
                €{lead.value}
              </p>

              <p className={`text-sm ${health.color}`}>
                {health.label}
              </p>

            </div>

          </div>
        )
      })}

    </div>

  </div>


  {/* RECENT ACTIVITY */}
  <div className="bg-[#111] p-6 rounded-xl">

    <h2 className="text-lg font-semibold mb-4">
      Recent Activity
    </h2>

    <div className="space-y-4">

      {activities.map((activity) => (

        <div
          key={activity.id}
          className="border-b border-white/10 pb-3"
        >

          <p className="text-sm">
            {activity.action}
          </p>

          <p className="text-xs text-zinc-500 mt-1">
            {new Date(activity.created_at).toLocaleString()}
          </p>

        </div>

      ))}

    </div>

  </div>

</div>

{/* EMPTY STATES */}

{topLeads.length === 0 && (
  <div className="bg-[#111] p-6 rounded-xl mt-6">
    <p className="text-zinc-500">
      No leads available yet.
    </p>
  </div>
)}

{activities.length === 0 && (
  <div className="bg-[#111] p-6 rounded-xl mt-6">
    <p className="text-zinc-500">
      No recent activity found.
    </p>
  </div>
)}


{/* FOOTER */}
<div className="mt-12 text-center text-zinc-500 text-sm">
  CloseFlow • AI-Inspired CRM • Build in Public 🚀
</div>

      </div>
    </AuthGuard>
  )
}