"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { useAppPreferences } from "@/components/AppPreferencesProvider"

type Props = {
  lead: any
}

const goals = [
  { value: "First Contact", de: "Erstkontakt", en: "First Contact" },
  { value: "Follow Up", de: "Nachfassen", en: "Follow Up" },
  { value: "Closing", de: "Abschluss", en: "Closing" },
  { value: "Reactivation", de: "Reaktivierung", en: "Reactivation" },
]

export default function AIEmailGenerator({ lead }: Props) {
  const { language } = useAppPreferences()
  const isDe = language === "de"

  const [goal, setGoal] = useState("Follow Up")
  const [tone, setTone] = useState("professional")
  const [loading, setLoading] = useState(false)
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")

  const generate = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const response = await fetch("/api/ai/email-generator", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ lead, goal, tone }),
    })
    const data = await response.json()
    setSubject(data.subject || "")
    setBody(data.body || "")
    setLoading(false)
  }

  return (
    <section className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-cyan-400">{isDe ? "KI-E-Mail-Generator" : "AI Email Generator"}</p>
          <h3 className="mt-2 text-xl font-semibold text-foreground">{isDe ? "E-Mail generieren" : "Generate Email"}</h3>
        </div>
        <button type="button" onClick={() => void generate()} className="rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-black">
          {loading ? (isDe ? "Wird generiert..." : "Generating...") : (isDe ? "E-Mail generieren" : "Generate Email")}
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="block text-sm text-foreground/70">
          {isDe ? "Ziel" : "Goal"}
          <select value={goal} onChange={(event) => setGoal(event.target.value)} className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground">
            {goals.map((option) => <option key={option.value} value={option.value}>{isDe ? option.de : option.en}</option>)}
          </select>
        </label>
        <label className="block text-sm text-foreground/70">
          {isDe ? "Ton" : "Tone"}
          <select value={tone} onChange={(event) => setTone(event.target.value)} className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground">
            <option value="professional">{isDe ? "Professionell" : "Professional"}</option>
            <option value="friendly">{isDe ? "Freundlich" : "Friendly"}</option>
            <option value="direct">{isDe ? "Direkt" : "Direct"}</option>
          </select>
        </label>
      </div>

      {subject ? <p className="mt-4 font-semibold text-foreground">{subject}</p> : null}
      {body ? <textarea readOnly value={body} className="mt-3 h-48 w-full rounded-xl border border-border-subtle bg-surface-2 p-4 text-sm text-foreground" /> : null}
    </section>
  )
}
