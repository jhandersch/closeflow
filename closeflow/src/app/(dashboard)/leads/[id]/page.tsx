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
  notes?: string
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

    setLoading(false)
  }

 const getRecommendation = () => {
  if (!lead) {
    return {
      title: "Loading lead data",
      description: "Please wait while we analyze this lead.",
      priority: "low",
      reason: "No lead data available yet",
    }
  }

  const isHighValue = (lead.value || 0) >= 5000

  if (lead.status === "won") {
    return {
      title: "Ask for referral",
      description: "Customer already converted. Ask for referral while satisfaction is high.",
      priority: "medium",
      reason: "Converted customer = referral opportunity",
    }
  }

  if (lead.status === "proposal" && isHighValue) {
    return {
      title: "Urgent closing call",
      description: "High-value deal in proposal stage. Act fast to close.",
      priority: "high",
      reason: "High value + proposal stage",
    }
  }

  if (lead.status === "proposal") {
    return {
      title: "Follow up on proposal",
      description: "Check if the proposal was reviewed.",
      priority: "medium",
      reason: "Proposal stage needs follow-up",
    }
  }

  if (lead.status === "contacted") {
    return {
      title: "Send follow-up email",
      description: "Keep momentum and move lead forward.",
      priority: "medium",
      reason: "Contacted leads need nurturing",
    }
  }

  return {
    title: "Qualify lead",
    description: "Gather more information before taking action.",
    priority: "low",
    reason: "New lead needs qualification",
  }
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

  const recommendation = getRecommendation()

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
              {recommendation?.title}
            </h3>

            <p className="text-zinc-400 mt-1">
              {recommendation?.description}
            </p>

            <p className="text-xs text-zinc-500 mt-2">
              {recommendation?.reason}
            </p>

            <span
              className={`text-xs mt-3 inline-block px-2 py-1 rounded ${
                recommendation?.priority === "high"
                  ? "bg-red-500/20 text-red-400"
                  : recommendation?.priority === "medium"
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "bg-blue-500/20 text-blue-400"
              }`}
            >
              {recommendation?.priority?.toUpperCase()} PRIORITY
            </span>
          </div>

        </div>
      </div>

      <div className="bg-[#111] p-6 rounded-xl space-y-4">

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