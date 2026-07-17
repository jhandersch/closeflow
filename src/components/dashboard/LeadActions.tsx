"use client"

import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { useAppPreferences } from "@/components/AppPreferencesProvider"

type LeadActionsProps = {
  leadId: string
  currentStatus: string
  phone?: string | null
  email?: string | null
  onLeadDeleted?: () => void
}

export default function LeadActions({
  leadId,
  currentStatus,
  phone,
  email,
  onLeadDeleted,
}: LeadActionsProps) {
  const router = useRouter()
  const { language } = useAppPreferences()
  const isDe = language === "de"

  const deleteLead = async () => {
    const confirmDelete = confirm(isDe ? "Diesen Lead löschen?" : "Delete this lead?")

    if (!confirmDelete) return

    const { error } = await supabase
      .from("leads")
      .delete()
      .eq("id", leadId)

    if (error) {
      console.error(error)
      return
    }

    onLeadDeleted?.()
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
          if (!phone?.trim()) return
          window.location.href = `tel:${phone.trim()}`
        }}
        disabled={!phone?.trim()}
        className="rounded-lg border border-border-subtle bg-white/5 px-3 py-1.5 text-xs text-foreground/80 hover:bg-white/10"
      >
        {isDe ? "Anrufen" : "Call"}
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation()
          if (!email?.trim()) return
          window.location.href = `mailto:${email.trim()}`
        }}
        disabled={!email?.trim()}
        className="rounded-lg border border-border-subtle bg-white/5 px-3 py-1.5 text-xs text-foreground/80 hover:bg-white/10"
      >
        {isDe ? "E-Mail" : "Email"}
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation()
          void deleteLead()
        }}
        className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/20"
      >
        {isDe ? "Löschen" : "Delete"}
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
        className="rounded-lg border border-border-subtle bg-surface-2 px-3 py-1.5 text-xs text-foreground/80"
      >
        <option value="new">{isDe ? "Neu" : "New"}</option>
        <option value="contacted">{isDe ? "Kontaktiert" : "Contacted"}</option>
        <option value="qualified">{isDe ? "Qualifiziert" : "Qualified"}</option>
        <option value="proposal">{isDe ? "Angebot" : "Proposal"}</option>
        <option value="won">{isDe ? "Gewonnen" : "Won"}</option>
        <option value="lost">{isDe ? "Verloren" : "Lost"}</option>
      </select>

      <button
        onClick={(e) => {
          e.stopPropagation()
          router.push(`/leads/${leadId}`)
        }}
        className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-300 hover:bg-cyan-400/20"
      >
        {isDe ? "Öffnen" : "Open"}
      </button>
    </div>
  )
}
