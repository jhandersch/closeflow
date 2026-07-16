"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import toast from "react-hot-toast"
import AuthGuard from "@/components/AuthGuard"
import { supabase } from "@/lib/supabase/client"

type Automation = {
  id: string
  name: string
  trigger_event: string
  actions: Array<{ type?: string; payload?: unknown }>
  enabled: boolean
}

const presets = [
  {
    name: "New Lead Follow-up",
    trigger_event: "lead.created",
    actions: [{ type: "task.create", payload: { title: "Call customer within 24h" } }],
  },
  {
    name: "Proposal Reminder",
    trigger_event: "lead.stage.proposal",
    actions: [{ type: "task.create", payload: { title: "Follow up in 3 days" } }],
  },
  {
    name: "Lost Deal Recovery",
    trigger_event: "lead.stage.lost",
    actions: [{ type: "task.create", payload: { title: "Ask lost reason and create reactivation reminder" } }],
  },
]

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)

  const readApiError = async (response: Response, fallback: string) => {
    try {
      const data = (await response.json()) as { error?: string }
      return data.error || fallback
    } catch {
      const text = await response.text()
      return text || fallback
    }
  }

  const showActionError = (message: string) => {
    if (message.toLowerCase().includes("two-factor authentication required")) {
      toast.error("2FA required for this action. Verify 2FA in Settings -> Security.")
      return
    }

    toast.error(message)
  }

  const load = async () => {
    setLoading(true)
    const response = await fetch("/api/automations")
    if (response.ok) {
      setAutomations((await response.json()) as Automation[])
    }
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    const loadSecurityState = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setTwoFactorEnabled(Boolean(user?.user_metadata?.two_factor_enabled))
    }

    void loadSecurityState()
  }, [])

  const installPreset = async (preset: Omit<Automation, "id" | "enabled">) => {
    const response = await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...preset, enabled: true }),
    })

    if (response.ok) {
      toast.success("Automation created")
      await load()
    } else {
      showActionError(await readApiError(response, "Could not create automation"))
    }
  }

  const toggle = async (item: Automation) => {
    const response = await fetch("/api/automations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, enabled: !item.enabled }),
    })

    if (response.ok) {
      await load()
    } else {
      showActionError(await readApiError(response, "Could not update automation"))
    }
  }

  return (
    <AuthGuard>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">Automations</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">Workflow Builder</h1>
          <p className="mt-2 text-sm text-foreground/65">Create repeatable workflows for lead and deal events.</p>
        </div>

        {!twoFactorEnabled ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-sm font-semibold text-amber-300">Enable 2FA for reliable automation management.</p>
            <p className="mt-1 text-sm text-amber-100/80">Privileged automation actions can require AAL2 verification.</p>
            <Link href="/settings#security" className="mt-3 inline-flex rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200">
              Open Security Settings
            </Link>
          </div>
        ) : null}

        <section className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
          <h2 className="text-xl font-semibold text-foreground">Quick presets</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {presets.map((preset) => (
              <button key={preset.name} onClick={() => void installPreset(preset)} className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 p-4 text-left transition hover:bg-cyan-500/15">
                <p className="font-semibold text-cyan-200">{preset.name}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-cyan-300/80">{preset.trigger_event}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
          <h2 className="text-xl font-semibold text-foreground">Active automations</h2>
          {loading ? (
            <p className="mt-3 text-sm text-foreground/60">Loading automations...</p>
          ) : automations.length === 0 ? (
            <p className="mt-3 text-sm text-foreground/55">No automations configured yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {automations.map((item) => (
                <article key={item.id} className="flex items-center justify-between rounded-xl border border-border-subtle bg-surface-2/70 p-4">
                  <div>
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-foreground/55">{item.trigger_event}</p>
                  </div>
                  <button onClick={() => void toggle(item)} className={`rounded-xl px-3 py-2 text-sm font-semibold ${item.enabled ? "bg-emerald-500/15 text-emerald-300" : "bg-foreground/10 text-foreground/70"}`}>
                    {item.enabled ? "Enabled" : "Disabled"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AuthGuard>
  )
}
