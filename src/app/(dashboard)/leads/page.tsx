"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import AuthGuard from "@/components/AuthGuard"
import LeadFilters from "@/components/dashboard/LeadFilters"
import { supabase } from "@/lib/supabase/client"
import { getHealthScore, getPriorityScore, getStaleDays } from "@/lib/scoring"
import { useLeadsData } from "@/hooks/useLeadsData"
import LeadPipeline from "@/components/dashboard/LeadPipeline"
import HealthRing from "@/components/dashboard/HealthRing"
import PriorityBadge from "@/components/dashboard/PriorityBadge"
import LeadActions from "@/components/dashboard/LeadActions"
import { leadDisplayName, leadCompany } from "@/lib/utils"
import { calculateSalesScore } from "@/lib/salesScore"
import { loadDemoData } from "@/lib/demoData"


export default function LeadsPage() {
  const { leads, loading, error, refresh } = useLeadsData({ activityLimit: 0 })
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [sortBy, setSortBy] = useState<"created_at" | "value" | "priority">("priority")
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [company, setCompany] = useState("")
  const [value, setValue] = useState("")
  const [notes, setNotes] = useState("")
  const [leadStatus, setLeadStatus] = useState("new")
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [view, setView] = useState<"list" | "pipeline">("list")
  const [favorites, setFavorites] = useState<string[]>([])
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoMessage, setDemoMessage] = useState<string | null>(null)
 

  const toggleFavorite = (id: string) => {
  setFavorites((current) =>
    current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]
  )
} 

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase()

    return [...leads]
      .filter((lead) => {
        const matchesQuery = !query || `${leadDisplayName(lead)} ${leadCompany(lead)}`.toLowerCase().includes(query)
        const matchesStatus = status === "all" || lead.status === status
        return matchesQuery && matchesStatus
      })
      .sort((a, b) => {
        if (sortBy === "value") return (b.value || 0) - (a.value || 0)
        if (sortBy === "created_at") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        return getPriorityScore(b) - getPriorityScore(a)
      })
  }, [leads, search, status, sortBy])

  const createLead = async () => {
    setFormError(null)
    setSubmitting(true)

    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user

    if (!user) {
      setFormError("You need an active session to create a lead.")
      setSubmitting(false)
      return
    }

    if (!name.trim()) {
  setFormError("Lead name is required")
  setSubmitting(false)
  return
}

if (!company.trim()) {
  setFormError("Company name is required")
  setSubmitting(false)
  return
}

const dealValue = Number(value)

if (isNaN(dealValue) || dealValue < 0) {
  setFormError("Deal value must be a valid number")
  setSubmitting(false)
  return
}


const { data: leadData, error } = await supabase
  .from("leads")
  .insert([
      {
      user_id: user.id,
      name: name.trim(),
      company: company.trim(),
      status: leadStatus,
      value: dealValue,
      notes: notes.trim() || "",
    },
  ])
  .select()
  .single()


if (error) {
  setFormError(error.message)
  setSubmitting(false)
  return
}
    await supabase.from("activities").insert([
      {
        lead_id: leadData.id,
        user_id: user.id,
        action: "Lead created",
      },
    ])

    setName("")
    setCompany("")
    setValue("")
    setNotes("")
    setLeadStatus("new")
    setShowForm(false)
    setSubmitting(false)
    await refresh()
  }

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">Pipeline</p>
            <h1 className="text-3xl font-bold text-white">Leads</h1>
            <p className="mt-2 text-sm text-zinc-400">Search, filter, sort, and follow up on the right opportunities.</p>
          </div>

          <div className="flex gap-3">

            <div className="flex rounded-xl border border-white/10 bg-[#111] p-1">

              <button
                onClick={() => setView("list")}
                className={`px-4 py-2 rounded-lg text-sm ${
                  view === "list"
                    ? "bg-white text-black"
                    : "text-zinc-400"
                }`}
              >
                ☰ List
              </button>

              <button
                onClick={() => setView("pipeline")}
                className={`px-4 py-2 rounded-lg text-sm ${
                  view === "pipeline"
                    ? "bg-white text-black"
                    : "text-zinc-400"
                }`}
              >
                ▦ Pipeline
              </button>

            </div>


            <button
              onClick={() => setShowForm(true)}
              className="rounded-xl bg-white px-4 py-2 font-medium text-black"
            >
              + Add Lead
            </button>

          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
            We couldn’t load your leads. {error}
          </div>
        ) : null}

        <LeadFilters
          search={search}
          status={status}
          sortBy={sortBy}
          onSearchChange={setSearch}
          onStatusChange={setStatus}
          onSortChange={setSortBy}
        />

        <div className="grid gap-4 md:grid-cols-4">

          <div className="rounded-2xl border border-white/10 bg-[#111] p-5">
            <p className="text-sm text-zinc-400">Total Leads</p>
            <p className="mt-2 text-3xl font-bold text-white">
              {filteredLeads.length}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111] p-5">
            <p className="text-sm text-zinc-400">Pipeline Value</p>
            <p className="mt-2 text-3xl font-bold text-emerald-400">
              €
              {filteredLeads
                .reduce((sum, lead) => sum + (lead.value || 0), 0)
                .toLocaleString("de-DE")}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111] p-5">
            <p className="text-sm text-zinc-400">Average Health</p>
            <p className="mt-2 text-3xl font-bold text-cyan-400">
              {Math.round(
                filteredLeads.reduce(
                  (sum, lead) => sum + getHealthScore(lead),
                  0
                ) / Math.max(filteredLeads.length, 1)
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111] p-5">
            <p className="text-sm text-zinc-400">Forecast Revenue</p>

            <p className="mt-2 text-3xl font-bold text-purple-400">
              €
              {filteredLeads
                .reduce((sum, lead) => {
                  const priority = getPriorityScore(lead)
                  const health = getHealthScore(lead)

                  const probability = Math.min(
                    95,
                    Math.round(
                      priority * 0.35 +
                      health * 0.35 +
                      (
                        lead.status === "won"
                          ? 100
                          : lead.status === "proposal"
                          ? 25
                          : lead.status === "contacted"
                          ? 10
                          : 0
                      )
                    )
                  )

                  return sum + (lead.value * probability) / 100
                }, 0)
                .toLocaleString("de-DE", {
                  maximumFractionDigits: 0,
                })}
            </p>
          </div>

        </div>

        {showForm ? (
          <div className="rounded-2xl border border-white/10 bg-[#111] p-6 shadow-sm shadow-black/30">
            {formError ? <p className="mb-3 text-sm text-rose-300">{formError}</p> : null}

            <div className="grid gap-4 md:grid-cols-2">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Name"
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-2 text-white outline-none"
              />

              <input
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                placeholder="Company"
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-2 text-white outline-none"
              />

              <input
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="Value"
                type="number"
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-2 text-white outline-none"
              />

              <select
                value={leadStatus}
                onChange={(event) => setLeadStatus(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-2 text-white outline-none"
              >
                <option value="new">new</option>
                <option value="contacted">contacted</option>
                <option value="proposal">proposal</option>
                <option value="won">won</option>
              </select>
              <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Notes about this lead..."
              className="md:col-span-2 w-full rounded-xl border border-white/10 bg-black px-4 py-2 text-white outline-none"
            />
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => void createLead()}
                disabled={submitting}
                className="rounded-xl bg-white px-4 py-2 font-medium text-black disabled:opacity-60"
              >
                {submitting ? "Creating..." : "Create lead"}
              </button>

              <button
                onClick={() => {
                  setShowForm(false)
                  setFormError(null)
                }}
                className="rounded-xl border border-white/10 bg-black px-4 py-2 text-zinc-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-3">

            {[1,2,3].map((item) => (
              <div
                key={item}
                className="
                  rounded-2xl
                  border
                  border-white/10
                  bg-[#111]
                  p-5
                  animate-pulse
                "
              >

                <div className="flex gap-4">

                  <div className="
                    h-14
                    w-14
                    rounded-full
                    bg-white/10
                  "/>


                  <div className="flex-1 space-y-3">

                    <div className="
                      h-4
                      w-40
                      rounded
                      bg-white/10
                    "/>

                    <div className="
                      h-3
                      w-24
                      rounded
                      bg-white/10
                    "/>

                    <div className="
                      h-3
                      w-32
                      rounded
                      bg-white/10
                    "/>

                  </div>

                </div>

              </div>
            ))}

          </div>
        ) : 
      filteredLeads.length === 0 ? (
          <div className="
          rounded-2xl
          border
          border-white/10
          bg-gradient-to-br
          from-[#111]
          to-[#18181b]
          p-10
          text-center
          ">
            <div className="text-4xl">
            🚀
            </div>

            <h3 className="
            mt-4
            text-xl
            font-semibold
            text-white
            ">
            No leads yet
            </h3>

            <p className="
            mt-2
            text-sm
            text-zinc-400
            ">
            Create your first opportunity and start building your pipeline.
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => setShowForm(true)}
                className="rounded-xl bg-white px-5 py-2 font-medium text-black"
              >
                Create first lead
              </button>
              <button
                onClick={async () => {
                  setDemoLoading(true)
                  setDemoMessage(null)
                  try {
                    const result = await loadDemoData()
                    setDemoMessage(result.message)
                    await refresh()
                  } catch (error) {
                    setDemoMessage(error instanceof Error ? error.message : "Could not load demo data")
                  } finally {
                    setDemoLoading(false)
                  }
                }}
                disabled={demoLoading}
                className="rounded-xl border border-white/10 bg-black/30 px-5 py-2 font-medium text-zinc-200 transition hover:bg-white/5 disabled:opacity-60"
              >
                {demoLoading ? "Loading demo data..." : "Load demo data"}
              </button>
            </div>
            {demoMessage ? <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{demoMessage}</div> : null}
          </div>
        ) : (
          view === "list" ? (

          <div className="space-y-3">
            {filteredLeads.map((lead) => {
              
              const staleDays = getStaleDays(lead)

              const salesScore = calculateSalesScore(
                lead,
                staleDays
              )

              const priority = salesScore.priority
              const health = salesScore.health
              const probability = salesScore.probability

              return (
                <div
                  key={lead.id}
                  onClick={() => router.push(`/leads/${lead.id}`)}
                  className="
                    cursor-pointer
                    block
                    rounded-2xl
                    border
                    border-white/10
                    bg-gradient-to-br
                    from-[#111]
                    to-[#18181b]
                    p-5
                    transition
                    hover:-translate-y-1
                    hover:shadow-xl
                    hover:shadow-cyan-500/10
                    hover:bg-white/5
                  "
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-4">

                              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-lg font-bold text-white shadow-lg">
                                {leadDisplayName(lead)
                                  .split(" ")
                                  .map((part) => part[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </div>

                              <div>
                                <div className="flex items-center gap-2">

                                  <p className="font-semibold text-lg text-white whitespace-nowrap overflow-hidden text-ellipsis max-w-[180px] md:max-w-[300px]">
                                    {leadDisplayName(lead)}
                                  </p>

                          <button
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              toggleFavorite(lead.id)
                            }}
                            className="text-xl"
                          >
                            {favorites.includes(lead.id)
                              ? "⭐"
                              : "☆"}
                          </button>

                        </div>

                        <p className="text-sm text-zinc-400">
                          {leadCompany(lead)}
                        </p>

                        <p className="mt-2 text-sm font-semibold text-white">
                          €{lead.value.toLocaleString("de-DE")}
                        </p>

                        <span
                          className={`inline-flex mt-2 rounded-full px-3 py-1 text-xs font-medium ${
                            lead.status === "new"
                              ? "bg-blue-500/20 text-blue-300"
                              : lead.status === "contacted"
                              ? "bg-yellow-500/20 text-yellow-300"
                              : lead.status === "proposal"
                              ? "bg-orange-500/20 text-orange-300"
                              : "bg-green-500/20 text-green-300"
                          }`}
                        >
                          {lead.status}
                          {probability > 80 && (
                            <span className="
                              ml-2
                              rounded-full
                              bg-orange-500/20
                              px-3
                              py-1
                              text-xs
                              font-medium
                              text-orange-300
                            ">
                              🔥 Hot Deal
                            </span>
                          )}
                        </span>
                      </div>

                    </div>

                    <div className="flex flex-wrap gap-3 text-right md:justify-end">
                      <PriorityBadge score={priority} />
                      <HealthRing value={health} />
                      <div>
                      <p className="text-xs text-zinc-400">
                        Close chance
                      </p>

                      <p className="text-lg font-bold text-cyan-400">
                        {probability}%
                      </p>
                    </div>

                    <div className="
                    rounded-xl
                    border
                    border-purple-500/20
                    bg-purple-500/10
                    px-4
                    py-3
                    ">

                    <p className="text-xs text-purple-300">
                    AI Signal
                    </p>

                    <p className="mt-1 text-sm font-semibold text-white">
                    {
                    staleDays > 14
                    ? "⚠️ Needs attention"
                    : probability > 80
                    ? "🔥 Strong closing signal"
                    : probability > 60
                    ? "🚀 Positive momentum"
                    : "🌱 Nurturing required"
                    }
                    </p>

                    </div>
                      <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3 text-left">

                        <p className="text-xs text-zinc-500">
                          Next action
                        </p>

                        <p className="mt-1 text-sm text-white">
                          {lead.next_action || "No action planned"}
                        </p>


                        {lead.next_action_date && (
                          <p
                            className={`mt-1 text-xs ${
                              new Date(lead.next_action_date) < new Date()
                                ? "text-red-400"
                                : "text-emerald-400"
                            }`}
                          >
                            📅 {new Date(
                              lead.next_action_date
                            ).toLocaleDateString("de-DE")}
                          </p>
                        )}

                      </div>

                      <div className="mt-2 text-xs text-zinc-500">
                       <div className="mt-3 flex items-center gap-2 text-xs">

                      <span className="text-zinc-400">
                      Last activity:
                      </span>

                      <span
                      className={
                      staleDays > 14
                      ? "font-semibold text-red-400"
                      : staleDays > 7
                      ? "font-semibold text-yellow-400"
                      : "font-semibold text-emerald-400"
                      }
                      >
                      {staleDays === 0
                      ? "Today"
                      : `${staleDays} days ago`}
                      </span>

                      </div>
                        <div
                          onClick={(event) => {
                            event.stopPropagation()
                          }}
                        >
                          <LeadActions
                            leadId={lead.id}
                            currentStatus={lead.status}
                          />
                        </div>
                      </div>
                      
                    </div>
                  </div>
                </div>
              )
            })}
                    </div>

  ) : (

    <LeadPipeline leads={filteredLeads}/>

  )

        )}
      </div>
    </AuthGuard>
  )
}