"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"

import { useAppPreferences } from "@/components/AppPreferencesProvider"
import { useLeadActions } from "@/hooks/useLeadActions"

import type {
  Lead,
  LeadStatus,
} from "@/types"

type LeadActionsProps = {
  leadId: string
  currentStatus: string
  phone?: string | null
  email?: string | null
  onLeadDeleted?: () => void
  onStatusChanged?: (
    updatedLead: Lead
  ) => void
}

const statuses: Array<{
  value: LeadStatus
  de: string
  en: string
  color: string
}> = [
  {
    value: "new",
    de: "Neu",
    en: "New",
    color: "bg-blue-500/20 text-blue-300 border-blue-400/30",
  },
  {
    value: "contacted",
    de: "Kontaktiert",
    en: "Contacted",
    color: "bg-yellow-500/20 text-yellow-300 border-yellow-400/30",
  },
  {
    value: "proposal",
    de: "Angebot",
    en: "Proposal",
    color: "bg-cyan-500/20 text-cyan-300 border-cyan-400/30",
  },
  {
    value: "won",
    de: "Gewonnen",
    en: "Won",
    color: "bg-green-500/20 text-green-300 border-green-400/30",
  },
  {
    value: "lost",
    de: "Verloren",
    en: "Lost",
    color: "bg-red-500/20 text-red-300 border-red-400/30",
  },
]

export default function LeadActions({
  leadId,
  currentStatus,
  phone,
  email,
  onLeadDeleted,
  onStatusChanged,
}: LeadActionsProps) {
  const router = useRouter()

  const { language } = useAppPreferences()

  const isDe = language === "de"

  const [openStatus, setOpenStatus] = useState(false)

  const {
    changeLeadStatus,
    deleteLead,
  } = useLeadActions()

  const current =
    statuses.find(
      (item) => item.value === currentStatus
    ) ?? statuses[0]

  async function handleStatusChange(
    newStatus: LeadStatus
  ) {
    setOpenStatus(false)

    if (newStatus === currentStatus) return

    try {
      const updatedLead = await changeLeadStatus(
        leadId,
        currentStatus as LeadStatus,
        newStatus
      )

      if (updatedLead) {
        onStatusChanged?.(updatedLead)
      }

      toast.success(
        isDe
          ? "Status geändert"
          : "Status updated"
      )
    } catch (error) {
      console.error(error)

      toast.error(
        isDe
          ? "Status konnte nicht geändert werden"
          : "Status update failed"
      )
    }
  }

  async function handleDelete() {
    const confirmed = confirm(
      isDe
        ? "Diesen Lead löschen?"
        : "Delete this lead?"
    )

    if (!confirmed) return

    try {
      await deleteLead(leadId)

      toast.success(
        isDe
          ? "Lead gelöscht"
          : "Lead deleted"
      )

      onLeadDeleted?.()
    } catch (error) {
      console.error(error)

      toast.error(
        isDe
          ? "Lead konnte nicht gelöscht werden"
          : "Delete failed"
      )
    }
  }

    return (
    <div className="flex flex-wrap gap-2 mt-4">

      <button
        onClick={(e) => {
          e.stopPropagation()

          if (phone) {
            window.location.href = `tel:${phone}`
          }
        }}
        disabled={!phone}
        className="
          rounded-lg
          border
          border-border-subtle
          bg-white/5
          px-3
          py-1.5
          text-xs
          hover:bg-white/10
          disabled:opacity-40
        "
      >
        {isDe ? "Anrufen" : "Call"}
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation()

          if (email) {
            window.location.href = `mailto:${email}`
          }
        }}
        disabled={!email}
        className="
          rounded-lg
          border
          border-border-subtle
          bg-white/5
          px-3
          py-1.5
          text-xs
          hover:bg-white/10
          disabled:opacity-40
        "
      >
        {isDe ? "E-Mail" : "Email"}
      </button>

      <div
        className="relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() =>
            setOpenStatus((prev) => !prev)
          }
          className={`
            rounded-lg
            border
            px-3
            py-1.5
            text-xs
            ${current.color}
          `}
        >
          {isDe ? current.de : current.en}

          <span className="ml-2">
            ▾
          </span>
        </button>

        {openStatus && (
          <div
            className="
              absolute
              z-50
              mt-2
              w-44
              rounded-xl
              border
              border-white/10
              bg-slate-900
              p-2
              shadow-xl
            "
          >
            {statuses.map((status) => (
              <button
                key={status.value}
                onClick={() =>
                  void handleStatusChange(
                    status.value
                  )
                }
                className={`
                  mb-1
                  w-full
                  rounded-lg
                  px-3
                  py-2
                  text-left
                  text-xs
                  hover:bg-white/10
                  ${status.color}
                `}
              >
                {isDe ? status.de : status.en}
              </button>
            ))}
          </div>
        )}
      </div>

            <button
        onClick={(e) => {
          e.stopPropagation()
          void handleDelete()
        }}
        className="
          rounded-lg
          border
          border-red-500/30
          bg-red-500/10
          px-3
          py-1.5
          text-xs
          text-red-300
          hover:bg-red-500/20
        "
      >
        {isDe ? "Löschen" : "Delete"}
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation()

          router.push(`/leads/${leadId}`)
        }}
        className="
          rounded-lg
          border
          border-cyan-400/30
          bg-cyan-400/10
          px-3
          py-1.5
          text-xs
          text-cyan-300
        "
      >
        {isDe ? "Öffnen" : "Open"}
      </button>
    </div>
  )
}