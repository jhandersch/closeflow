"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Sidebar from "@/components/Sidebar"
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

const columns = ["new", "contacted", "proposal", "won"]

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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

    load()
  }, [])

  const getByStatus = (status: string) =>
    leads.filter((l) => l.status === status)

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
      <div className="text-white flex items-center justify-center min-h-screen">
        Loading pipeline...
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-black text-white">
      <Sidebar />

      <div className="flex-1 p-8">

        <h1 className="text-3xl font-bold mb-8">
          Pipeline
        </h1>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-4 gap-4">

            {columns.map((col) => (
              <Droppable droppableId={col} key={col}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="bg-[#111] rounded-2xl p-4 min-h-[500px]"
                  >
                    <h2 className="text-zinc-400 mb-4 capitalize">
                      {col}
                    </h2>

                    <div className="space-y-3">
                      {getByStatus(col).map((lead, index) => (
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
                              className="bg-black border border-white/10 p-3 rounded-xl cursor-grab active:cursor-grabbing hover:bg-white/5 transition"
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

                  </div>
                )}
              </Droppable>
            ))}

          </div>
        </DragDropContext>

      </div>
    </div>
  )
}