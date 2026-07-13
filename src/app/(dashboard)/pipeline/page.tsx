"use client"

import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd"
import EmptyState from "@/components/EmptyState"
import { loadDemoData } from "@/lib/demoData"
import { supabase } from "@/lib/supabase/client"
import { leadCompany, leadDisplayName } from "@/lib/utils"
import type { Lead, LeadStatus } from "@/types"

type StageConfig = {
  id: LeadStatus
  label: string
  accent: string
  chip: string
}

const stages: StageConfig[] = [
  { id: "new", label: "New", accent: "from-sky-500/20 to-sky-300/10", chip: "text-sky-300" },
  { id: "contacted", label: "Contacted", accent: "from-amber-500/20 to-amber-300/10", chip: "text-amber-300" },
  { id: "qualified", label: "Qualified", accent: "from-violet-500/20 to-violet-300/10", chip: "text-violet-300" },
  { id: "proposal", label: "Proposal", accent: "from-orange-500/20 to-orange-300/10", chip: "text-orange-300" },
  { id: "won", label: "Won", accent: "from-emerald-500/20 to-emerald-300/10", chip: "text-emerald-300" },
  { id: "lost", label: "Lost", accent: "from-rose-500/20 to-rose-300/10", chip: "text-rose-300" },
]

const getPriorityScore = (lead: Lead) => {
  const stageWeight: Record<LeadStatus, number> = {
    new: 20,
    contacted: 45,
    qualified: 65,
    proposal: 80,
    won: 100,
    lost: 10,
  }

  const valueBonus = Math.min(30, Math.floor((lead.value || 0) / 1000) * 3)
  return Math.min(100, stageWeight[lead.status] + valueBonus)
}

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [savingLeadId, setSavingLeadId] = useState<string | null>(null)
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoMessage, setDemoMessage] = useState<string | null>(null)

  useEffect(() => {
    void load()
  }, [])

  const load = async () => {
    setLoading(true)

    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user

    if (!user) {
      setLeads([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      toast.error(error.message)
      setLeads([])
      setLoading(false)
      return
    }

    setLeads((data || []) as Lead[])
    setLoading(false)
  }

  const stats = useMemo(() => {
    const total = leads.length
    const pipelineValue = leads
      .filter((lead) => lead.status !== "lost")
      .reduce((sum, lead) => sum + (lead.value || 0), 0)
    const wonValue = leads
      .filter((lead) => lead.status === "won")
      .reduce((sum, lead) => sum + (lead.value || 0), 0)
    const lostCount = leads.filter((lead) => lead.status === "lost").length

    return {
      total,
      pipelineValue,
      wonValue,
      lostCount,
    }
  }, [leads])

  const updateLeadStatus = async (lead: Lead, nextStatus: LeadStatus) => {
    const previousStatus = lead.status

    setSavingLeadId(lead.id)

    setLeads((current) =>
      current.map((item) =>
        item.id === lead.id
          ? {
              ...item,
              status: nextStatus,
              stage_changed_at: new Date().toISOString(),
              last_activity_at: new Date().toISOString(),
            }
          : item
      )
    )

    let updateResult = await supabase
      .from("leads")
      .update({
        status: nextStatus,
        stage_changed_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", lead.id)

    if (updateResult.error && /column .* does not exist/i.test(updateResult.error.message || "")) {
      updateResult = await supabase
        .from("leads")
        .update({
          status: nextStatus,
          stage_changed_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString(),
        })
        .eq("id", lead.id)
    }

    if (updateResult.error) {
      setLeads((current) =>
        current.map((item) =>
          item.id === lead.id
            ? {
                ...item,
                status: previousStatus,
              }
            : item
        )
      )
      setSavingLeadId(null)
      toast.error(updateResult.error.message)
      return
    }

    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user

    if (user) {
      await supabase.from("activities").insert([
        {
          lead_id: lead.id,
          user_id: user.id,
          action: `Status changed from ${previousStatus} to ${nextStatus}`,
          type: "status_changed",
        },
      ])
    }

    setSavingLeadId(null)
    toast.success(`Lead moved to ${nextStatus}`)
  }

  const onDragEnd = async (result: DropResult) => {
    const { destination, draggableId } = result

    if (!destination) return

    const nextStatus = destination.droppableId as LeadStatus
    const lead = leads.find((item) => item.id === draggableId)

    if (!lead || lead.status === nextStatus) return

    await updateLeadStatus(lead, nextStatus)
  }

  if (loading) {
    return <div className="rounded-3xl border border-border-subtle bg-surface-1 p-8 text-foreground">Loading pipeline...</div>
  }

  if (!leads.length) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={<span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-base font-semibold text-cyan-300">PL</span>}
          title="No deals in the pipeline yet"
          description="Start by creating a lead or loading demo data to see the pipeline board come to life."
          actions={
            <button
              onClick={async () => {
                setDemoLoading(true)
                setDemoMessage(null)
                try {
                  const result = await loadDemoData()
                  setDemoMessage(result.message)
                  await load()
                } catch (error) {
                  setDemoMessage(error instanceof Error ? error.message : "Could not load demo data")
                } finally {
                  setDemoLoading(false)
                }
              }}
              disabled={demoLoading}
              className="rounded-xl bg-foreground px-4 py-2 font-semibold text-background transition hover:opacity-90 disabled:opacity-60"
            >
              {demoLoading ? "Loading demo data..." : "Load demo data"}
            </button>
          }
        />
        {demoMessage ? <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{demoMessage}</div> : null}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">Pipeline</p>
          <h1 className="text-3xl font-bold text-foreground">Drag deals between stages</h1>
          <p className="mt-2 text-sm text-foreground/65">Mouse move updates stage automatically and logs timeline activity.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border-subtle bg-surface-1 px-4 py-3">
            <p className="text-xs text-foreground/65">Leads</p>
            <p className="text-lg font-semibold text-foreground">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-border-subtle bg-surface-1 px-4 py-3">
            <p className="text-xs text-foreground/65">Pipeline</p>
            <p className="text-lg font-semibold text-emerald-300">€{Math.round(stats.pipelineValue).toLocaleString("de-DE")}</p>
          </div>
          <div className="rounded-xl border border-border-subtle bg-surface-1 px-4 py-3">
            <p className="text-xs text-foreground/65">Won Value</p>
            <p className="text-lg font-semibold text-cyan-300">€{Math.round(stats.wonValue).toLocaleString("de-DE")}</p>
          </div>
          <div className="rounded-xl border border-border-subtle bg-surface-1 px-4 py-3">
            <p className="text-xs text-foreground/65">Lost Deals</p>
            <p className="text-lg font-semibold text-rose-300">{stats.lostCount}</p>
          </div>
        </div>
      </div>

      <DragDropContext onDragEnd={(result) => void onDragEnd(result)}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {stages.map((stage) => {
            const stageLeads = leads.filter((lead) => lead.status === stage.id)
            const stageValue = stageLeads.reduce((sum, lead) => sum + (lead.value || 0), 0)

            return (
              <Droppable key={stage.id} droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[420px] rounded-2xl border bg-gradient-to-br p-3 transition-all ${
                      snapshot.isDraggingOver
                        ? `border-cyan-500/60 ${stage.accent}`
                        : "border-border-subtle from-surface-1 to-surface-2"
                    }`}
                  >
                    <div className="mb-3 rounded-xl border border-border-subtle bg-surface-2/70 px-3 py-2">
                      <div className="flex items-center justify-between">
                        <h2 className={`text-sm font-semibold ${stage.chip}`}>{stage.label}</h2>
                        <span className="text-xs text-foreground/65">{stageLeads.length}</span>
                      </div>
                      <p className="mt-1 text-xs text-foreground/55">€{Math.round(stageValue).toLocaleString("de-DE")}</p>
                    </div>

                    <div className="space-y-3">
                      {stageLeads.map((lead, index) => {
                        const priority = getPriorityScore(lead)

                        return (
                          <Draggable key={lead.id} draggableId={lead.id} index={index}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                className={`rounded-xl border p-3 transition-all ${
                                  dragSnapshot.isDragging
                                    ? "scale-[1.02] border-cyan-400/80 bg-surface-1 shadow-xl shadow-cyan-500/20"
                                    : "border-border-subtle bg-surface-1 hover:border-foreground/25"
                                }`}
                              >
                                <p className="font-medium text-foreground">{leadDisplayName(lead)}</p>
                                <p className="mt-1 text-xs text-foreground/65">{leadCompany(lead)}</p>
                                <p className="mt-2 text-sm font-semibold text-emerald-300">€{(lead.value || 0).toLocaleString("de-DE")}</p>

                                <div className="mt-3 flex items-center justify-between">
                                  <span className="text-[11px] text-foreground/65">Priority</span>
                                  <span className="text-[11px] font-semibold text-cyan-300">{priority}/100</span>
                                </div>
                                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-foreground/10">
                                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500" style={{ width: `${priority}%` }} />
                                </div>

                                {savingLeadId === lead.id ? (
                                  <p className="mt-2 text-[11px] text-amber-300">Saving stage change...</p>
                                ) : null}
                              </div>
                            )}
                          </Draggable>
                        )
                      })}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            )
          })}
        </div>
      </DragDropContext>
    </div>
  )
}
