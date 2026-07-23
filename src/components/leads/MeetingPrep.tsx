"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase/client"

type Props = { lead: any }

export default function MeetingPrep({ lead }: Props) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const generate = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const response = await fetch("/api/ai/meeting-prep", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ lead }),
    })
    setResult(await response.json())
    setLoading(false)
  }

  return (
    <section className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-cyan-400">Meeting-Vorbereitung</p>
          <h3 className="mt-2 text-xl font-semibold text-foreground">Meeting vorbereiten</h3>
        </div>
        <button type="button" onClick={() => void generate()} className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300">
          {loading ? "Vorbereitung..." : "Meeting vorbereiten"}
        </button>
      </div>

      {result ? (
        <div className="mt-4 space-y-3 text-sm text-foreground/80">
          <p><span className="font-semibold text-foreground">Summary:</span> {result.customer_summary}</p>
          <p><span className="font-semibold text-foreground">Important points:</span> {(result.important_points || []).join(", ")}</p>
          <p><span className="font-semibold text-foreground">Questions:</span> {(result.questions || []).join(", ")}</p>
          <p><span className="font-semibold text-foreground">Risks:</span> {(result.risks || []).join(", ")}</p>
          <p><span className="font-semibold text-foreground">Next steps:</span> {(result.next_steps || []).join(", ")}</p>
        </div>
      ) : null}
    </section>
  )
}
