"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import {
  getPriorityScore,
  getHealthScore,
  getStaleDays,
} from "@/lib/scoring"
import AICoachCard from "@/components/leads/AICoachCard"
import { generateAIInsight } from "@/lib/ai"

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

type Recommendation = {
  title: string
  description: string
  priority: "low" | "medium" | "high"
  reason: string
  score: number
  icon: string
  action?: string
  confidence?: number
}

type AICoach = {
  title: string
  message: string
  reasons: string[]
  action: string
  confidence: number
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

  const finalScore = getPriorityScore(lead)
  const staleDays = getStaleDays(lead)

  const actions: Recommendation[] = []

  if (lead.status === "new") {
    actions.push({
      icon: "🧠",
      title: "Qualify lead",
      description: "Gather missing information and identify intent.",
      priority: "low",
      reason: "New lead needs qualification.",
      score: finalScore,
    })
  }

  if (lead.status === "contacted") {
    actions.push({
      icon: "📧",
      title: "Send follow-up",
      description: "Re-engage the customer within the next 48 hours.",
      priority: "medium",
      reason: "Lead has been contacted but not progressed.",
      score: finalScore,
    })
  }

  if (lead.status === "proposal") {
    actions.push({
      icon: "🔥",
      title: "Call customer today",
      description: "Address objections and close the deal.",
      priority: finalScore >= 75 ? "high" : "medium",
      reason: "Proposal stage requires immediate attention.",
      score: finalScore,
    })
  }

  if (lead.status === "won") {
    actions.push({
      icon: "🤝",
      title: "Request referral",
      description: "Ask the customer for referrals or testimonials.",
      priority: "medium",
      reason: "Won customers create new opportunities.",
      score: finalScore,
    })
  }

  if (lead.value >= 10000) {
    actions.push({
      icon: "💰",
      title: "High-value opportunity",
      description: "This deal deserves extra attention.",
      priority: "high",
      reason: "Deal value exceeds €10,000.",
      score: finalScore,
    })
  }

  if (staleDays > 7 && lead.status !== "won") {
    actions.push({
      icon: "⚠️",
      title: "Lead becoming inactive",
      description: "No recent activity detected.",
      priority: "high",
      reason: `${staleDays} days without activity.`,
      score: 100,
    })
  }

  actions.sort((a, b) => b.score - a.score)

  return actions
}

const getNextAction = () => {
  if (!lead) return null

  const priority = getPriorityScore(lead)
  const staleDays = getStaleDays(lead)

  if (staleDays > 7 && lead.status !== "won") {
    return {
      icon: "🚨",
      title: "Immediate follow-up required",
      action: "Contact customer today",
      description:
        "Lead has no recent activity and may lose interest.",
      confidence: 92,
    }
  }

  if (lead.status === "proposal") {
    return {
      icon: "🔥",
      title: "Closing opportunity",
      action: "Schedule closing call",
      description:
        "Proposal stage with active buying signal.",
      confidence: 87,
    }
  }

  if (priority > 80) {
    return {
      icon: "⭐",
      title: "High priority lead",
      action: "Give personal attention",
      description:
        "Lead score indicates strong opportunity.",
      confidence: 82,
    }
  }

  return {
    icon: "📌",
    title: "Continue nurturing",
    action: "Maintain relationship",
    description:
      "No urgent action required.",
    confidence: 70,
  }
}

  const getAICoach = (): AICoach => {
    if (!lead) {
      return {
        title: "No analysis available",
        message: "Waiting for lead data.",
        reasons: [],
        action: "Check lead information",
        confidence: 0,
      }
    }

    const priority = getPriorityScore(lead)
    const staleDays = getStaleDays(lead)

    if (staleDays > 7 && lead.status !== "won") {
      return {
        title: "Lead needs attention",
        message: "This lead has become inactive.",
        reasons: [
          `${staleDays} days without activity`,
          "Customer interest may decrease",
        ],
        action: "Contact customer today",
        confidence: 92,
      }
    }

    if (lead.status === "proposal") {
      return {
        title: "Closing opportunity",
        message: "This lead is close to conversion.",
        reasons: [
          "Proposal stage reached",
          "Customer is evaluating the offer",
        ],
        action: "Schedule closing call",
        confidence: 87,
      }
    }

    if (priority > 80) {
      return {
        title: "High priority lead",
        message: "This lead shows strong buying signals.",
        reasons: [
          "High priority score",
          "Good pipeline position",
        ],
        action: "Give personal attention",
        confidence: 82,
      }
    }

    return {
      title: "Continue nurturing",
      message: "Lead is progressing normally.",
      reasons: [
        "No urgent risks detected",
        "Maintain communication",
      ],
      action: "Follow up later",
      confidence: 70,
    }
  }

  const getAIRisk = () => {
    if (!lead) return null

    const staleDays = getStaleDays(lead)
    const stageAge = getStageAge()

    if (lead.status !== "won" && staleDays > 14) {
      return {
        level: "high",
        title: "Lead going cold",
        message:
          `No activity for ${staleDays} days. Customer interest may decrease.`,
        icon: "🚨",
      }
    }


    if (
      lead.status === "proposal" &&
      stageAge > 10
    ) {
      return {
        level: "medium",
        title: "Deal stuck in proposal",
        message:
          `Proposal stage for ${stageAge} days. Consider a follow-up call.`,
        icon: "⚠️",
      }
    }


    if (lead.value >= 10000) {
      return {
        level: "medium",
        title: "High-value opportunity",
        message:
          "Large deal requires active management.",
        icon: "💰",
      }
    }


    return {
      level: "low",
      title: "Healthy lead",
      message:
        "No major risks detected.",
      icon: "✅",
    }
  }

  const getScoreExplanation = () => {
    if (!lead) return []

    const reasons = []

    const priority = getPriorityScore(lead)

    if (lead.value >= 10000) {
      reasons.push({
        icon: "💰",
        text: "High deal value increases opportunity score",
      })
    }

    if (
      lead.status === "proposal" ||
      lead.status === "won"
    ) {
      reasons.push({
        icon: "🔥",
        text: "Lead is in an advanced pipeline stage",
      })
    }

    if (lead.status === "new") {
      reasons.push({
        icon: "🧠",
        text: "Lead still needs qualification",
      })
    }

    if (getStaleDays(lead) <= 3) {
      reasons.push({
        icon: "⚡",
        text: "Recent activity shows good engagement",
      })
    }

    if (getStaleDays(lead) > 7) {
      reasons.push({
        icon: "⚠️",
        text: "Inactive leads reduce conversion probability",
      })
    }

    if (priority > 80) {
      reasons.push({
        icon: "⭐",
        text: "Strong overall opportunity signal",
      })
    }

    return reasons
  }

  const getDaysInStage = () => {
      if (!lead?.stage_changed_at) return 0

      const start = new Date(lead.stage_changed_at).getTime()
      const now = new Date().getTime()

      return Math.floor((now - start) / (1000 * 60 * 60 * 24))
    }

    const getDealAge = () => {
      if (!lead) return 0

      const created = new Date(lead.created_at).getTime()
      const now = Date.now()

      return Math.floor((now - created) / (1000 * 60 * 60 * 24))
    }

    const getStageAge = () => {
      if (!lead?.stage_changed_at) return 0

      const changed = new Date(lead.stage_changed_at).getTime()
      const now = Date.now()

      return Math.floor(
        (now - changed) / (1000 * 60 * 60 * 24)
      )
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

    const updateData: any = {
      name,
      company,
      status,
      value: Number(value),
      notes,
    }


    if (oldStatus !== status) {
      updateData.stage_changed_at = new Date().toISOString()
    }


    const { error } = await supabase
      .from("leads")
      .update(updateData)
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
  const dealAge = getDealAge()
  const healthScore = getHealthScore(lead)
  const priorityScore = getPriorityScore(lead)
  const stageAge = getStageAge()
  const nextAction = getNextAction()
  const aiCoach = getAICoach()
  const aiInsight = generateAIInsight(lead)
  const aiRisk = getAIRisk()
  const scoreReasons = getScoreExplanation()

  return (
    <div className="max-w-2xl space-y-6">

      {saved && (
        <div className="fixed top-6 right-6 bg-green-600 text-white px-4 py-2 rounded-xl shadow-lg z-50">
          ✓ Changes saved
        </div>
      )}

      <div className="flex items-center justify-between">

      <div>
        <h1 className="text-3xl font-bold text-white">
          {lead.name}
        </h1>

        <p className="mt-1 text-zinc-400">
          {lead.company}
        </p>
      </div>

      <span
        className={`rounded-full px-4 py-2 text-sm font-medium ${
          lead.status === "new"
            ? "bg-blue-500/20 text-blue-300"
            : lead.status === "contacted"
            ? "bg-yellow-500/20 text-yellow-300"
            : lead.status === "proposal"
            ? "bg-orange-500/20 text-orange-300"
            : "bg-green-500/20 text-green-300"
        }`}
      >
        {lead.status.toUpperCase()}
      </span>

    </div>

    <div className="rounded-2xl border border-white/10 bg-[#111] p-6">

      <div className="flex items-center justify-between mb-6">

        <h2 className="text-lg font-semibold text-white">
          Pipeline Journey
        </h2>

        <span className="text-cyan-400 font-semibold">
          {lead.status.toUpperCase()}
        </span>

      </div>


      <div className="flex items-center justify-between">

        {["new", "contacted", "proposal", "won"].map((stage, index) => {

          const stages = [
            "new",
            "contacted",
            "proposal",
            "won"
          ]

          const currentIndex = stages.indexOf(lead.status)

          const completed = index <= currentIndex


          return (

            <div
              key={stage}
              className="flex flex-col items-center flex-1"
            >

              <div
                className={`
                  h-10 w-10 rounded-full flex items-center justify-center
                  font-bold transition
                  ${
                    completed
                    ? "bg-cyan-500 text-black"
                    : "bg-zinc-800 text-zinc-500"
                  }
                `}
              >
                {index + 1}
              </div>


              <p
                className={`
                  mt-3 text-xs
                  ${
                    completed
                    ? "text-cyan-400"
                    : "text-zinc-500"
                  }
                `}
              >
                {stage}
              </p>


            </div>

          )

        })}

      </div>


    </div>

      

      <div className="bg-[#111] p-6 rounded-xl">
        <h2 className="text-xl font-semibold mb-4">
          AI Recommendation
        </h2>

<div className="space-y-4">

  {recommendations.map((item) => (

    <div
      key={item.title}
      className="border border-white/10 rounded-xl p-4"
    >
      <div className="flex items-start gap-3">

        <span className="text-2xl">
          {item.icon}
        </span>

        <div className="flex-1">

          <h3 className="font-semibold">
            {item.title}
          </h3>

          <p className="text-zinc-400 text-sm mt-1">
            {item.description}
          </p>

          <p className="text-xs text-zinc-500 mt-2">
            {item.reason}
          </p>

          <span
            className={`inline-block mt-3 text-xs px-2 py-1 rounded ${
              item.priority === "high"
                ? "bg-red-500/20 text-red-400"
                : item.priority === "medium"
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-blue-500/20 text-blue-400"
            }`}
          >
            {item.priority.toUpperCase()}
          </span>

        </div>

      </div>

    </div>

  ))}


  {nextAction && (
    <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent p-6">

      <div className="flex items-start justify-between">

        <div>
          <p className="text-sm uppercase tracking-widest text-cyan-400">
            AI Next Action
          </p>

          <h2 className="mt-2 text-3xl font-bold text-white">
            {nextAction?.action}
          </h2>

          <p className="mt-3 max-w-xl text-zinc-400">
            {nextAction?.description}
          </p>
        </div>

        <div className="rounded-full bg-cyan-500/20 px-4 py-2 text-cyan-300 font-semibold">
          {nextAction?.confidence}%
        </div>

      </div>

    </div>

  )}

</div>

  </div>

  <AICoachCard aiCoach={aiCoach} />

  <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent p-6">

    <div className="flex items-center justify-between">

      <div>

        <p className="text-sm uppercase tracking-widest text-cyan-400">
          AI Sales Intelligence
        </p>

        <h2 className="mt-2 text-2xl font-bold text-white">
          Lead Analysis
        </h2>

      </div>

      <div className="text-4xl">
        🧠
      </div>

    </div>


    <div className="mt-6 grid gap-4 md:grid-cols-4">


      <div className="rounded-xl bg-black/30 p-4">
        <p className="text-sm text-zinc-500">
          Lead Score
        </p>

        <p className="mt-2 text-3xl font-bold text-cyan-400">
          {aiInsight.score}
        </p>
      </div>


      <div className="rounded-xl bg-black/30 p-4">
        <p className="text-sm text-zinc-500">
          Health
        </p>

        <p className="mt-2 text-3xl font-bold text-green-400">
          {aiInsight.health}
        </p>
      </div>


      <div className="rounded-xl bg-black/30 p-4">
        <p className="text-sm text-zinc-500">
          Win Chance
        </p>

        <p className="mt-2 text-3xl font-bold text-purple-400">
          {aiInsight.probability}%
        </p>
      </div>


      <div className="rounded-xl bg-black/30 p-4">
        <p className="text-sm text-zinc-500">
          Risk
        </p>

        <p className="mt-2 text-3xl font-bold text-yellow-400">
          {aiInsight.risk}
        </p>
      </div>


    </div>


    <div className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4">

      <p className="text-sm text-zinc-500">
        Recommended Action
      </p>

      <p className="mt-2 text-lg font-semibold text-white">
        {aiInsight.recommendation}
      </p>

    </div>


  </div>

  {aiRisk && (

  <div className="rounded-2xl border border-white/10 bg-[#111] p-6">

    <div className="flex items-start gap-4">

      <div className="text-4xl">
        {aiRisk.icon}
      </div>


      <div>

        <p className="text-sm uppercase tracking-widest text-zinc-500">
          AI Risk Detection
        </p>


        <h2 className="mt-2 text-xl font-bold text-white">
          {aiRisk.title}
        </h2>


        <p className="mt-2 text-zinc-400">
          {aiRisk.message}
        </p>


      </div>
     
      <div className="rounded-2xl border border-white/10 bg-[#111] p-6">

        <p className="text-sm uppercase tracking-widest text-cyan-400">
          AI Score Explanation
        </p>


        <h2 className="mt-2 text-2xl font-bold text-white">
          Why this score?
        </h2>


        <div className="mt-4 space-y-3">

          {scoreReasons.map((reason) => (

            <div
              key={reason.text}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 p-3"
            >

              <span className="text-xl">
                {reason.icon}
              </span>

              <p className="text-zinc-300">
                {reason.text}
              </p>

            </div>

          ))}

        </div>

      </div>

    </div>

  </div>

  )}

  <div className="bg-[#111] p-6 rounded-xl">

        <h2 className="text-xl font-semibold mb-4">
          Deal Information
        </h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">

          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <p className="text-2xl">📅</p>
            <p className="mt-3 text-sm text-zinc-500">Deal Age</p>
            <p className="mt-1 text-2xl font-bold text-white">
              {dealAge} days
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <p className="text-2xl">⚡</p>
            <p className="mt-3 text-sm text-zinc-500">Priority</p>
            <p className="mt-1 text-2xl font-bold text-emerald-400">
              {priorityScore}/100
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <p className="text-2xl">❤️</p>
            <p className="mt-3 text-sm text-zinc-500">Health</p>
            <p className="mt-1 text-2xl font-bold text-cyan-400">
              {healthScore}/100
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <p className="text-2xl">💶</p>
            <p className="mt-3 text-sm text-zinc-500">Deal Value</p>
            <p className="mt-1 text-2xl font-bold text-purple-400">
              €{lead.value.toLocaleString("de-DE")}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/30 p-4">

            <p className="text-2xl">
              ⏳
            </p>

            <p className="mt-3 text-sm text-zinc-500">
              Time in Stage
            </p>

            <p className="mt-1 text-2xl font-bold text-yellow-400">
              {stageAge} days
            </p>

          </div>

        </div>

      </div>

        <div className="bg-[#111] p-6 rounded-xl space-y-4">

          <h2 className="text-xl font-semibold">
          Lead Details
        </h2>

        <div className="grid gap-5 md:grid-cols-2">

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Contact Name
            </label>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Company
            </label>

            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Deal Value
            </label>

            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              type="number"
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Stage
            </label>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white"
            >
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="proposal">Proposal</option>
              <option value="won">Won</option>
            </select>
          </div>

        </div>

        <div className="mt-6">

          <label className="mb-2 block text-sm text-zinc-400">
            Notes
          </label>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="h-40 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white"
          />

        </div>

        <div className="mt-6 flex gap-3">

          <button
            onClick={saveChanges}
            className="rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:scale-[1.02]"
          >
            Save Changes
          </button>

          <button
            onClick={deleteLead}
            className="rounded-xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-700"
          >
            Delete Lead
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
