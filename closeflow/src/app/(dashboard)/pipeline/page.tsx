"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  DragDropContext,
  Droppable,
  Draggable,
} from "@hello-pangea/dnd"

type Lead = {
  id: string
  name: string
  company: string
  status: string
  value?: number
}

const stages = ["new", "contacted", "proposal", "won"]

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([])
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

    setLeads(data || [])
    setLoading(false)
  }

  const getScore = (lead: Lead) => {
    let score = 0

    switch (lead.status) {
      case "new":
        score += 20
        break
      case "contacted":
        score += 50
        break
      case "proposal":
        score += 80
        break
      case "won":
        score += 100
        break
    }

    if ((lead.value || 0) > 1000) score += 10
    if ((lead.value || 0) > 5000) score += 20
    if ((lead.value || 0) > 10000) score += 30

    return Math.min(score, 100)
  }

  const getPriority = (score: number) => {
    if (score >= 80) {
      return {
        text: "🔴 High Priority",
        color: "text-red-400",
      }
    }

    if (score >= 50) {
      return {
        text: "🟡 Medium Priority",
        color: "text-yellow-400",
      }
    }

    return {
      text: "🟢 Low Priority",
      color: "text-green-400",
    }
  }

  const getRecommendation = (lead: Lead) => {
    if (lead.status === "new") {
      return {
        text: "🔵 Send first message",
        color: "text-blue-400",
      }
    }

    if (lead.status === "contacted") {
      return {
        text: "🟡 Follow up with lead",
        color: "text-yellow-400",
      }
    }

    if (lead.status === "proposal") {
      return {
        text: "🔴 Schedule closing call",
        color: "text-red-400",
      }
    }

    return {
      text: "🟢 Upsell opportunity",
      color: "text-green-400",
    }
  }

  const onDragEnd = async (result: any) => {
    const { destination, draggableId } = result

    if (!destination) return

    const newStatus = destination.droppableId

    const lead = leads.find((l) => l.id === draggableId)

    if (!lead) return
    if (lead.status === newStatus) return

    setLeads((prev) =>
      prev.map((l) =>
        l.id === draggableId
          ? {
              ...l,
              status: newStatus,
            }
          : l
      )
    )

    await supabase
      .from("leads")
      .update({
        status: newStatus,
      })
      .eq("id", draggableId)

    const { data: userData } = await supabase.auth.getUser()

    if (userData.user) {
      await supabase.from("activities").insert([
        {
          lead_id: draggableId,
          user_id: userData.user.id,
          action: `Moved to ${newStatus}`,
          type: "status",
        },
      ])
    }
  }

  if (loading) {
    return <div className="text-white">Loading pipeline...</div>
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">
        Pipeline
      </h1>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-4">

          {stages.map((stage) => {
            const stageLeads = leads.filter(
              (l) => l.status === stage
            )

            const stageValue = stageLeads.reduce(
              (sum, l) => sum + (l.value || 0),
              0
            )

            return (
              <Droppable key={stage} droppableId={stage}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="bg-[#111] p-4 rounded-xl min-h-[500px]"
                  >
                    <div className="mb-4">
                      <h2 className="capitalize text-zinc-400 font-medium">
                        {stage}
                      </h2>

                      <p className="text-xs text-zinc-500">
                        {stageLeads.length} leads
                      </p>

                      <p className="text-sm text-green-400">
                        €{stageValue}
                      </p>
                    </div>

                    {stageLeads.map((lead, index) => {
                      const score = getScore(lead)
                      const priority = getPriority(score)
                      const recommendation = getRecommendation(lead)

                      return (
                        <Draggable
                          key={lead.id}
                          draggableId={lead.id}
                          index={index}
                        >
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="bg-black border border-white/10 p-4 mb-3 rounded-xl cursor-grab active:cursor-grabbing hover:border-white/20 transition"
                            >
                              <p className="font-medium">
                                {lead.name}
                              </p>

                              <p className="text-sm text-zinc-400 mt-1">
                                {lead.company}
                              </p>

                              <p className="text-xs text-zinc-500 mt-3">
                                €{lead.value || 0}
                              </p>

                              <div
                                className={`mt-4 text-sm font-medium ${priority.color}`}
                              >
                                {priority.text}
                              </div>

                              <div className="text-xs text-zinc-500 mt-1">
                                Score: {score}/100
                              </div>

                              <div
                                className={`text-xs mt-3 ${recommendation.color}`}
                              >
                                {recommendation.text}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      )
                    })}

                    {provided.placeholder}
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
