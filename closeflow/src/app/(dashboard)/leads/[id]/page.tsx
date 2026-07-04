"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

type Lead = {
  id: string
  name: string
  company: string
  status: string
  value: number
  created_at: string
  notes?: string
  stage_changed_at?: string
}

type Activity = {
  id: string
  action: string
  type?: string
  created_at: string
}

type Action = {
  title: string
  description: string
  priority: "low" | "medium" | "high"
  reason: string
}

type Recommendation = {
  title: string
  description: string
  priority: "low" | "medium" | "high"
  reason: string
  score: number
}

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()

  const id = params?.id as string

  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  const [activities, setActivities] = useState<Activity[]>([])

  const [name, setName] = useState("")
  const [company, setCompany] = useState("")
  const [status, setStatus] = useState("new")
  const [value, setValue] = useState("")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (!id) return
    load()
  }, [id])

  const load = async () => {
    setLoading(true)

    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .single()

    setLead(data)

    const { data: activityData } = await supabase
      .from("activities")
      .select("*")
      .eq("lead_id", id)
      .order("created_at", { ascending: false })

    setActivities(activityData || [])

    setName(data.name || "")
    setCompany(data.company || "")
    setStatus(data.status || "new")
    setValue(data.value?.toString() || "")
    setNotes(data.notes || "")

    setLead(data)

    setLoading(false)
  }

const getRecommendations = (): Recommendation[] => {
  if (!lead) return []

  const baseScore =
    (lead.status === "new" && 10) ||
    (lead.status === "contacted" && 30) ||
    (lead.status === "proposal" && 60) ||
    (lead.status === "won" && 100) ||
    0

  const value = lead.value || 0

  const valueScore =
    value >= 10000 ? 30 :
    value >= 5000 ? 20 :
    value >= 1000 ? 10 : 0

  const staleDays = getStaleDays()

  const staleScore =
    staleDays > 14 ? 100 :
    staleDays > 7 ? 70 :
    staleDays > 3 ? 40 : 10

  const finalScore = Math.min(baseScore + valueScore + staleScore * 0.4, 100)

  const actions: Recommendation[] = []

  // 🧠 CORE LOGIC LAYER

  if (lead.status === "new") {
    actions.push({
      title: "Qualify lead",
      description: "Gather missing information and identify intent",
      priority: "low",
      reason: "New lead needs qualification",
      score: finalScore
    })
  }

  if (lead.status === "contacted") {
    actions.push({
      title: "Send follow-up",
      description: "Re-engage lead within 24–48h",
      priority: "medium",
      reason: "Contacted but not progressed",
      score: finalScore
    })
  }

  if (lead.status === "proposal") {
    actions.push({
      title: "Push proposal decision",
      description: "Address objections and close deal",
      priority: finalScore > 75 ? "high" : "medium",
      reason: "Proposal stage is critical",
      score: finalScore
    })
  }

  if (lead.status === "won") {
    actions.push({
      title: "Request referral",
      description: "Leverage success for new leads",
      priority: "medium",
      reason: "Closed deal opportunity",
      score: finalScore
    })
  }

  // 🚨 STALE OVERRIDE LAYER
  if (staleDays > 10 && lead.status !== "won") {
    actions.unshift({
      title: "URGENT: Lead is going cold",
      description: "No activity detected — risk of loss",
      priority: "high",
      reason: `${staleDays} days without activity`,
      score: 100
    })
  }

  return actions
}

  const getDaysInStage = () => {
      if (!lead?.stage_changed_at) return 0

      const start = new Date(lead.stage_changed_at).getTime()
      const now = new Date().getTime()

      return Math.floor((now - start) / (1000 * 60 * 60 * 24))
    }
  
  const getStaleDays = () => {
      if (!lead?.stage_changed_at) return 0

      const last = new Date(lead.stage_changed_at).getTime()
      const now = Date.now()

      return Math.floor((now - last) / (1000 * 60 * 60 * 24))
    }

      const getDealAge = () => {
        if (!lead) return 0

        const created = new Date(lead.created_at).getTime()
        const now = Date.now()

        return Math.floor((now - created) / (1000 * 60 * 60 * 24))
      }

      const getStaleScore = () => {
        const days = getStaleDays()

        if (days > 14) return 100
        if (days > 7) return 70
        if (days > 3) return 40
        return 10
}

  const getActivityIcon = (type?: string) => {
  switch (type) {
    case "status":
      return "🔄"

    case "note":
      return "📝"

    default:
      return "📌"
  }
}

  const saveChanges = async () => {
    if (!lead) return

    const oldStatus = lead.status

    const { error } = await supabase
      .from("leads")
      .update({
        name,
        company,
        status,
        value: Number(value),
        notes,
      })
      .eq("id", lead.id)

    if (error) {
      alert(error.message)
      return
    }

    if (oldStatus !== status) {
      const { data: userData } = await supabase.auth.getUser()
      const user = userData.user

      if (user) {
        await supabase.from("activities").insert([
          {
            lead_id: lead.id,
            user_id: user.id,
            action: `Status changed from ${oldStatus} to ${status}`,
            type: "status",
          },
        ])
      }
    }

    await load()

    setSaved(true)

    setTimeout(() => {
      setSaved(false)
    }, 2000)
  }

  const deleteLead = async () => {
    if (!lead) return

    const ok = confirm("Delete this lead?")

    if (!ok) return

    const { error } = await supabase
      .from("leads")
      .delete()
      .eq("id", lead.id)

    if (error) {
      alert(error.message)
      return
    }

    router.push("/leads")
  }

  if (loading) {
    return <div className="text-white">Loading...</div>
  }

  if (!lead) {
    return <div className="text-white">Lead not found</div>
  }

  const recommendations = getRecommendations()
  const primary = recommendations[0]
  const dealAge = getDealAge()

  return (
    <div className="max-w-2xl space-y-6">

      {saved && (
        <div className="fixed top-6 right-6 bg-green-600 text-white px-4 py-2 rounded-xl shadow-lg z-50">
          ✓ Changes saved
        </div>
      )}

      <h1 className="text-3xl font-bold">
        Edit Lead
      </h1>

      <div className="bg-[#111] p-6 rounded-xl">
        <h2 className="text-xl font-semibold mb-4">
          AI Recommendation
        </h2>

        <div className="flex gap-4">

          <div>
            <h3 className="font-semibold text-lg">
              {primary?.title}
            </h3>

            <p className="text-zinc-400 mt-1">
              {primary?.description}
            </p>

            <p className="text-xs text-zinc-500 mt-2">
              {primary?.reason}
            </p>

            <span
              className={`text-xs mt-3 inline-block px-2 py-1 rounded ${
                primary?.priority === "high"
                  ? "bg-red-500/20 text-red-400"
                  : primary?.priority === "medium"
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "bg-blue-500/20 text-blue-400"
              }`}
            >
              {primary?.priority?.toUpperCase()} PRIORITY
            </span>
          </div>

        </div>
      </div>

      <div className="bg-[#111] p-6 rounded-xl space-y-4">
      <div className="bg-[#111] p-6 rounded-xl">

        <h2 className="text-xl font-semibold mb-4">
          Deal Information
        </h2>

        <div className="grid grid-cols-3 gap-6">

          <div>
            <p className="text-zinc-500 text-sm">
              Deal Age
            </p>

            <p className="text-2xl font-bold mt-1">
              {dealAge} days
            </p>
          </div>

          <div>
            <p className="text-zinc-500 text-sm">
              Status
            </p>

            <p className="text-2xl font-bold mt-1 capitalize">
              {lead.status}
            </p>
          </div>

          <div>
            <p className="text-zinc-500 text-sm">
              Priority Score
            </p>

            <p className="text-2xl font-bold mt-1 text-green-400">
              {primary?.score ?? 0}/100
            </p>
          </div>

        </div>

      </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-black border border-white/10 rounded-xl px-4 py-2"
          placeholder="Name"
        />

        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="w-full bg-black border border-white/10 rounded-xl px-4 py-2"
          placeholder="Company"
        />

        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full bg-black border border-white/10 rounded-xl px-4 py-2"
          placeholder="Value"
          type="number"
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

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full h-32 bg-black border border-white/10 rounded-xl px-4 py-2"
          placeholder="Notes"
        />

        <div className="flex gap-3">

          <button
            onClick={saveChanges}
            className="bg-white text-black px-4 py-2 rounded-xl"
          >
            Save Changes
          </button>

          <button
            onClick={deleteLead}
            className="bg-red-600 text-white px-4 py-2 rounded-xl"
          >
            Delete
          </button>

        </div>

      </div>

      <div className="bg-[#111] p-6 rounded-xl">

        <h2 className="text-xl font-semibold mb-4">
          Activity Timeline
        </h2>

        {activities.length === 0 ? (
          <p className="text-zinc-500">
            No activities yet.
          </p>
        ) : (
          <div className="space-y-3">

            {activities.map((a) => (
              <div
                key={a.id}
                className="border-b border-white/10 pb-3"
              >

                <div className="flex gap-3 items-center">

                <span className="text-xl">
                  {getActivityIcon(a.type)}
                </span>

                <div>

                  <p className="font-medium">
                    {a.action}
                  </p>

                  <p className="text-xs text-zinc-500">
                    {a.type || "event"}
                  </p>

                  <p className="text-xs text-zinc-500 mt-1">
                    {new Date(a.created_at).toLocaleString()}
                  </p>

  </div>

</div>

              </div>
            ))}

          </div>
        )}

      </div>

    </div>
  )
}