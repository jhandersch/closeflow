"use client"

import { useRouter } from "next/navigation"

type LeadActionsProps = {
  leadId: string
}

export default function LeadActions({
  leadId,
}: LeadActionsProps) {

  const router = useRouter()

  return (
    <div className="flex gap-2 mt-4">

      <button
        onClick={(e) => {
          e.stopPropagation()
        }}
        className="
          rounded-lg
          border border-white/10
          bg-white/5
          px-3
          py-1.5
          text-xs
          text-zinc-300
          hover:bg-white/10
        "
      >
        📞 Call
      </button>


      <button
        onClick={(e) => {
          e.stopPropagation()
        }}
        className="
          rounded-lg
          border border-white/10
          bg-white/5
          px-3
          py-1.5
          text-xs
          text-zinc-300
          hover:bg-white/10
        "
      >
        ✉ Email
      </button>


      <button
        onClick={(e) => {
          e.stopPropagation()
          router.push(`/leads/${leadId}`)
        }}
        className="
          rounded-lg
          border border-cyan-400/30
          bg-cyan-400/10
          px-3
          py-1.5
          text-xs
          text-cyan-300
          hover:bg-cyan-400/20
        "
      >
        Open
      </button>

    </div>
  )
}