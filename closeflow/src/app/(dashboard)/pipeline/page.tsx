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

    if (!user) return

    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("user_id", user.id)

    setLeads(data || [])
    setLoading(false)
  }

  const onDragEnd = async (result: any) => {
    const { destination, draggableId } = result

    if (!destination) return

    const newStatus = destination.droppableId

    setLeads((prev) =>
      prev.map((l) =>
        l.id === draggableId
          ? { ...l, status: newStatus }
          : l
      )
    )

    await supabase
      .from("leads")
      .update({ status: newStatus })
      .eq("id", draggableId)
  }

  if (loading) {
    return (
      <div className="text-white">
        Loading pipeline...
      </div>
    )
  }

  return (
    <div>

      <h1 className="text-3xl font-bold mb-6">
        Pipeline
      </h1>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-4 gap-4">

          {stages.map((stage) => (
            <Droppable droppableId={stage} key={stage}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="bg-[#111] p-4 rounded-xl min-h-[500px]"
                >
                  <h2 className="mb-4 capitalize text-zinc-400">
                    {stage}
                  </h2>

                  {leads
                    .filter((l) => l.status === stage)
                    .map((lead, index) => (
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
                            className="bg-black border border-white/10 p-3 mb-2 rounded cursor-grab active:cursor-grabbing"
                          >
                            <p className="font-medium">
                              {lead.name}
                            </p>
                            <p className="text-xs text-zinc-400">
                              {lead.company}
                            </p>
                          </div>
                        )}
                      </Draggable>
                    ))}

                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))}

        </div>
      </DragDropContext>

    </div>
  )
}