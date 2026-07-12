"use client"

import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"

type LeadActionsProps = {
  leadId: string
  currentStatus: string
}

export default function LeadActions({
  leadId,
  currentStatus,
}: LeadActionsProps) {
  const router = useRouter()

  const deleteLead = async () => {
    const confirmDelete = confirm("Delete this lead?")

    if (!confirmDelete) return

    const { error } = await supabase
      .from("leads")
      .delete()
      .eq("id", leadId)

    if (error) {
      console.error(error)
      return
    }

    router.refresh()
  }

  const updateStatus = async (newStatus: string) => {
    const { error } = await supabase
      .from("leads")
      .update({
        status: newStatus,
      })
      .eq("id", leadId)

    if (error) {
      console.error(error)
      return
    }

    router.refresh()
  }

  return (
    <div className="flex gap-2 mt-4">
      <button
        onClick={(e) => {
          e.stopPropagation()
        }}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/10"
      >
        📞 Call
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation()
        }}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/10"
      >
        ✉ Email
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation()
          void deleteLead()
        }}
        className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/20"
      >
        🗑 Delete
      </button>

      <select
        value={currentStatus}
        onChange={(e) => {
          e.stopPropagation()
          void updateStatus(e.target.value)
        }}
        onClick={(e) => {
          e.stopPropagation()
        }}
        className="rounded-lg border border-white/10 bg-black px-3 py-1.5 text-xs text-zinc-300"
      >
        <option value="new">New</option>
        <option value="contacted">Contacted</option>
        <option value="proposal">Proposal</option>
        <option value="won">Won</option>
      </select>

      <button
        onClick={(e) => {
          e.stopPropagation()
          router.push(`/leads/${leadId}`)
        }}
        className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-300 hover:bg-cyan-400/20"
      >
        Open
      </button>
    </div>
  )
}