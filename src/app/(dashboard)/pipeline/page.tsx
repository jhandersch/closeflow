"use client"

import { useEffect, useMemo, useState } from "react"
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd"
import AuthGuard from "@/components/AuthGuard"
import { supabase } from "@/lib/supabase/client"
import { useLeadsData } from "@/hooks/useLeadsData"
import type { Lead } from "@/types"
import toast from "react-hot-toast"

type StageKey = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost"

const stageOrder: Array<{ key: StageKey; label: string }> = [
  { key: "new", label: "NEU" },
  { key: "contacted", label: "KONTAKTIERT" },
  { key: "qualified", label: "QUALIFIZIERT" },
  { key: "proposal", label: "ANGEBOT" },
  { key: "won", label: "GEWONNEN" },
  { key: "lost", label: "VERLOREN" },
]

const normalizeStage = (status: string): StageKey => {
  if (status === "contacted") return "contacted"
  if (status === "qualified") return "qualified"
  if (status === "proposal") return "proposal"
  if (status === "won") return "won"
  if (status === "lost") return "lost"
  return "new"
}

const stageLabel: Record<StageKey, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
}

export default function PipelinePage() {
  const { leads, loading } = useLeadsData({ activityLimit: 5 })
  const [columns, setColumns] = useState<Record<StageKey, Lead[]>>({
    new: [],
    contacted: [],
    qualified: [],
    proposal: [],
    won: [],
    lost: [],
  })

  useEffect(() => {
    const grouped: Record<StageKey, Lead[]> = {
      new: [],
      contacted: [],
      qualified: [],
      proposal: [],
      won: [],
      lost: [],
    }

    for (const lead of leads) {
      grouped[normalizeStage(lead.status)].push(lead)
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setColumns(grouped)
  }, [leads])

  const totalValue = useMemo(() => leads.reduce((sum, lead) => sum + (lead.value || 0), 0), [leads])

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const nextStage = destination.droppableId as StageKey
    const lead = leads.find((item) => item.id === draggableId)

    if (!lead) return

    const previousColumns = columns
    const previousStage = normalizeStage(lead.status)

    setColumns((current) => {
      const next = { ...current }
      const sourceStage = source.droppableId as StageKey
      const destinationStage = destination.droppableId as StageKey
      const sourceItems = [...next[sourceStage]]
      const destinationItems = sourceStage === destinationStage ? sourceItems : [...next[destinationStage]]

      const [moved] = sourceItems.splice(source.index, 1)
      destinationItems.splice(destination.index, 0, moved)

      next[sourceStage] = sourceItems
      next[destinationStage] = destinationItems

      return next
    })

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setColumns(previousColumns)
      return
    }

    const nowIso = new Date().toISOString()

    const { error: updateError } = await supabase
      .from("leads")
      .update({
        status: nextStage,
        stage_changed_at: nowIso,
        last_activity_at: nowIso,
      })
      .eq("id", lead.id)
      .eq("user_id", user.id)

    if (updateError) {
      setColumns(previousColumns)
      toast.error("Pipeline update failed")
      return
    }

    const { error: activityError } = await supabase
      .from("activities")
      .insert({
        workspace_id: lead.workspace_id || null,
        lead_id: lead.id,
        user_id: user.id,
        type: "status_changed",
        title: `Status changed from ${stageLabel[previousStage]} to ${stageLabel[nextStage]}`,
        description: `${lead.name || "Lead"} moved from ${stageLabel[previousStage]} to ${stageLabel[nextStage]}`,
        action: `Status changed from ${previousStage} to ${nextStage}`,
        metadata: {
          previous_status: previousStage,
          next_status: nextStage,
          trigger: "pipeline_drag_drop",
        },
      })

    if (activityError) {
      toast.error("Status history could not be saved")
    }
  }

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">Pipeline</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">Pipeline-Kanban</h1>
          <p className="mt-2 text-sm text-foreground/65">Gesamte Pipeline: €{totalValue.toLocaleString("de-DE")}</p>
        </div>

        {loading ? (
          <p className="text-foreground/65">Lädt...</p>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid gap-4 xl:grid-cols-6">
              {stageOrder.map((stage) => (
                <Droppable key={stage.key} droppableId={stage.key}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="min-h-[600px] rounded-2xl border border-border-subtle bg-surface-1 p-4"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-sm font-semibold tracking-[0.2em] text-foreground/70">{stage.label}</h2>
                        <span className="rounded-full bg-foreground/5 px-2 py-1 text-xs text-foreground/60">
                          {columns[stage.key].length}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {columns[stage.key].map((lead, index) => (
                          <Draggable key={lead.id} draggableId={lead.id} index={index}>
                            {(draggableProvided) => (
                              <article
                                ref={draggableProvided.innerRef}
                                {...draggableProvided.draggableProps}
                                {...draggableProvided.dragHandleProps}
                                className="rounded-2xl border border-border-subtle bg-surface-2/80 p-4"
                              >
                                <p className="font-semibold text-foreground">{lead.name || "Unbenannter Lead"}</p>
                                <p className="mt-1 text-xs text-foreground/55">{lead.company || "Keine Firma"}</p>
                                <p className="mt-3 text-sm text-foreground/80">€{(lead.value || 0).toLocaleString("de-DE")}</p>
                              </article>
                            )}
                          </Draggable>
                        ))}
                      </div>

                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
          </DragDropContext>
        )}
      </div>
    </AuthGuard>
  )
}