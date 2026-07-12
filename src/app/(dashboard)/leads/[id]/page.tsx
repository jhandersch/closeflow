"use client"

import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import {
  getPriorityScore,
  getHealthScore,
  getStaleDays,
} from "@/lib/scoring"
import AICoachCard from "@/components/leads/AICoachCard"
import { generateAIInsight } from "@/lib/ai"
import PipelineJourney from "@/components/leads/PipelineJourney"
import DealMetrics from "@/components/leads/DealMetrics"
import ActivityTimeline from "@/components/leads/ActivityTimeline"
import AIScoreCard from "@/components/leads/AIScoreCard"
import AIRiskCard from "@/components/leads/AIRiskCard"
import AIScoreExplanation from "@/components/leads/AIScoreExplanation"
import { useLeadDetail } from "@/hooks/useLeadDetail"
import { useLeadActions } from "@/hooks/useLeadActions"
import { useLeadAI } from "@/hooks/useLeadAI"
import { leadDisplayName, leadCompany } from "@/lib/utils"
import AIActionCard from "@/components/leads/AIActionCard"
import AIFollowUp from "@/components/leads/AIFollowUp"
import { useLeadMemoryAI } from "@/hooks/useLeadMemoryAI"
import LeadMemoryCard from "@/components/leads/LeadMemoryCard"
import { useActivityAI } from "@/hooks/useActivityAI"
import ActivityIntelligenceCard 
from "@/components/leads/ActivityIntelligenceCard"
import {
 calculateSalesScore
} from "@/lib/salesScore"
import AISalesCopilot from "@/components/leads/AISalesCopilot"

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

  const {
    lead,
    activities,
    loading,
    refresh,
  } = useLeadDetail(id)

  const {
    saveLead,
    deleteLead,
  } = useLeadActions(refresh)

  const {
    recommendations,
    nextAction,
    aiInsight,
    aiRisk,
    scoreReasons,
    aiCoach,
  } = useLeadAI(lead)

  const {
    memory,
    loading: memoryLoading,
  } = useLeadMemoryAI(lead, activities)

  const {
    insight: activityInsight,
    loading: activityLoading
    }=useActivityAI(
    lead,
    activities
    )


  const [saved, setSaved] = useState(false)


  const [name, setName] = useState("")
  const [company, setCompany] = useState("")
  const [status, setStatus] = useState("new")
  const [value, setValue] = useState("")
  const [notes, setNotes] = useState("")



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
      switch(type){

        case "status":
          return "🔄"

        case "note":
          return "📝"

        case "ai":
          return "🤖"

        default:
          return "📌"
      }
}

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1200px] rounded-3xl border border-white/10 bg-[#111] p-8" aria-busy="true" aria-live="polite">
        <div className="h-7 w-56 animate-pulse rounded-full bg-white/10" />
        <div className="mt-4 h-4 w-44 animate-pulse rounded-full bg-white/10" />
        <div className="mt-8 h-32 animate-pulse rounded-2xl bg-white/10" />
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="mx-auto w-full max-w-[900px] rounded-3xl border border-white/10 bg-[#111] p-10 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">Lead unavailable</p>
        <h1 className="mt-4 text-2xl font-semibold text-white">We could not find this lead.</h1>
        <p className="mt-3 text-sm leading-7 text-zinc-400">The record may have been removed or you may not have access to it.</p>
      </div>
    )
  }

  const dealAge = getDealAge()
  const salesScore =
  calculateSalesScore(
    lead,
    getStaleDays(lead)
    )
  const stageAge = getStageAge()
  

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">

      {saved && (
        <div className="fixed right-6 top-6 z-50 rounded-2xl border border-emerald-500/20 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300 shadow-lg">
          ✓ Changes saved successfully
        </div>
      )}

      <div className="flex items-center justify-between">

      <div>
        <h1 className="text-3xl font-bold text-white">
          {leadDisplayName(lead)}
        </h1>

        <p className="mt-1 text-zinc-400">
          {leadCompany(lead)}
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

    <PipelineJourney status={lead.status} />

      

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

{aiCoach && (
  <AICoachCard aiCoach={aiCoach} />
)}

<LeadMemoryCard
  memory={memory}
  loading={memoryLoading}
/>

<AIFollowUp lead={lead} />

<ActivityIntelligenceCard
  insight={activityInsight}
  loading={activityLoading}
/>

<AISalesCopilot
  lead={lead}
  activities={activities}
  memory={memory}
  risk={aiRisk}
  status={lead.status}
/>

{nextAction && (
  <AIActionCard
    leadId={lead.id}
    action={nextAction.action}
    description={nextAction.description}
  />
)}

{aiInsight && (
  <AIScoreCard
    score={aiInsight.score}
    health={aiInsight.health}
    probability={aiInsight.probability}
    risk={aiInsight.risk}
    recommendation={aiInsight.recommendation}
  />
)}

  {aiRisk && (
    <AIRiskCard risk={aiRisk} />
  )}

  <AIScoreExplanation reasons={scoreReasons} />

  

 <DealMetrics
    dealAge={dealAge}
    priorityScore={salesScore.priority}
    healthScore={salesScore.health}
    value={lead.value}
    stageAge={stageAge}
/>

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
              className="w-full rounded-2xl border border-white/10 bg-black/80 px-4 py-3 text-white outline-none transition focus:border-cyan-400/50"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Company
            </label>

            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/80 px-4 py-3 text-white outline-none transition focus:border-cyan-400/50"
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
              className="w-full rounded-2xl border border-white/10 bg-black/80 px-4 py-3 text-white outline-none transition focus:border-cyan-400/50"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Stage
            </label>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/80 px-4 py-3 text-white outline-none transition focus:border-cyan-400/50"
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
            className="h-40 w-full rounded-2xl border border-white/10 bg-black/80 px-4 py-3 text-white outline-none transition focus:border-cyan-400/50"
          />

        </div>

        <div className="mt-6 flex gap-3">

          <button
            onClick={async () => {

              if (!lead) return

              try {
                await saveLead(
                  lead.id,
                  lead.status,
                  {
                    name,
                    company,
                    status,
                    value:Number(value),
                    notes,
                  }
                )

                setSaved(true)
                toast.success("Lead updated")
                window.setTimeout(() => setSaved(false), 2200)
              } catch (error) {
                console.error(error)
                toast.error("Could not save lead")
              }

              }}
            className="rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:scale-[1.02]"
          >
            Save Changes
          </button>

          <button
            onClick={async () => {

              if (!lead) return

              const ok = window.confirm("Delete this lead? This action cannot be undone.")

              if (!ok) return

              try {
                await deleteLead(lead.id)
                toast.success("Lead deleted")
                router.push("/leads")
              } catch (error) {
                console.error(error)
                toast.error("Could not delete lead")
              }

            }}
            className="rounded-xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-700"
          >
            Delete Lead
          </button>


  </div>

</div>

      <ActivityTimeline activities={activities} />

    </div>

 )
}
