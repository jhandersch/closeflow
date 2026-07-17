"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import toast from "react-hot-toast"
import { Plus, Trash2, ChevronRight, Zap, X } from "lucide-react"
import AuthGuard from "@/components/AuthGuard"
import { useAppPreferences } from "@/components/AppPreferencesProvider"
import { supabase } from "@/lib/supabase/client"

type ActionItem = { type: string; payload: Record<string, string> }

type Automation = {
  id: string
  name: string
  trigger_event: string
  actions: ActionItem[]
  enabled: boolean
}

const TRIGGERS = [
  { value: "lead.created",        labelDe: "Lead erstellt",            labelEn: "Lead created",          descriptionDe: "Wird ausgelöst, wenn ein neuer Lead angelegt wird", descriptionEn: "Fires when a new lead is added" },
  { value: "lead.stage.proposal", labelDe: "Lead in Angebotsphase",    labelEn: "Lead to Proposal",      descriptionDe: "Lead wechselt in die Angebotsphase", descriptionEn: "Lead enters proposal stage" },
  { value: "lead.stage.won",      labelDe: "Lead gewonnen",            labelEn: "Lead to Won",           descriptionDe: "Lead wird als gewonnen markiert", descriptionEn: "Lead marked as won" },
  { value: "lead.stage.lost",     labelDe: "Lead verloren",            labelEn: "Lead to Lost",          descriptionDe: "Lead wird als verloren markiert", descriptionEn: "Lead marked as lost" },
  { value: "lead.idle_7d",        labelDe: "Lead 7 Tage inaktiv",      labelEn: "Lead idle 7 days",      descriptionDe: "Keine Aktivität seit 7 Tagen", descriptionEn: "No activity for 7 days" },
  { value: "lead.idle_14d",       labelDe: "Lead 14 Tage inaktiv",     labelEn: "Lead idle 14 days",     descriptionDe: "Keine Aktivität seit 14 Tagen", descriptionEn: "No activity for 14 days" },
  { value: "task.overdue",        labelDe: "Aufgabe überfällig",       labelEn: "Task overdue",          descriptionDe: "Aufgabe ist nach Fälligkeitsdatum", descriptionEn: "Task past its due date" },
]

const ACTION_TYPES = [
  { value: "task.create",         labelDe: "Aufgabe erstellen",        labelEn: "Create task",           field: "title" as const },
  { value: "lead.status.update",  labelDe: "Lead-Status aktualisieren", labelEn: "Update lead status",    field: "status" as const },
  { value: "notify.user",         labelDe: "Benachrichtigung senden",   labelEn: "Send notification",     field: "message" as const },
]

const PRESETS: Omit<Automation, "id" | "enabled">[] = [
  { name: "Neuer-Lead Follow-up", trigger_event: "lead.created",        actions: [{ type: "task.create",  payload: { title: "Kundin/Kunden innerhalb von 24h anrufen" } }] },
  { name: "Angebots-Erinnerung",  trigger_event: "lead.stage.proposal", actions: [{ type: "task.create",  payload: { title: "In 3 Tagen nachfassen" } }] },
  { name: "Verlorener Deal",      trigger_event: "lead.stage.lost",     actions: [{ type: "task.create",  payload: { title: "Verlustgrund erfragen und Reaktivierung planen" } }] },
  { name: "Inaktiver Lead Alarm", trigger_event: "lead.idle_7d",        actions: [{ type: "notify.user",  payload: { message: "Dieser Lead ist seit 7 Tagen inaktiv" } }] },
  { name: "Gewonnener Deal",      trigger_event: "lead.stage.won",      actions: [{ type: "task.create",  payload: { title: "Danke senden und nach Empfehlung fragen" } }] },
]

const emptyAction = (): ActionItem => ({ type: "task.create", payload: { title: "" } })

export default function AutomationsPage() {
  const { language } = useAppPreferences()
  const isDe = language === "de"

  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [builderOpen, setBuilderOpen] = useState(false)
  const [bName, setBName] = useState("")
  const [bTrigger, setBTrigger] = useState(TRIGGERS[0].value)
  const [bActions, setBActions] = useState<ActionItem[]>([emptyAction()])
  const [bSaving, setBSaving] = useState(false)

  const getHeaders = async (json = false) => {
    const { data: { session } } = await supabase.auth.getSession()
    const h: Record<string, string> = {}
    if (json) h["Content-Type"] = "application/json"
    if (session?.access_token) h.Authorization = `Bearer ${session.access_token}`
    return h
  }

  const readApiError = async (res: Response, fallback: string) => {
    try { return ((await res.json()) as { error?: string }).error || fallback }
    catch { return (await res.text()) || fallback }
  }

  const showErr = (msg: string) => {
    if (msg.toLowerCase().includes("two-factor")) {
      toast.error(isDe ? "2FA erforderlich. Aktiviere 2FA in Einstellungen -> Sicherheit." : "2FA required. Enable 2FA in Settings -> Security.")
    } else {
      toast.error(msg)
    }
  }

  const load = async () => {
    setLoading(true)
    const res = await fetch("/api/automations", {
      headers: await getHeaders(),
      credentials: "include",
    })
    if (res.ok) setAutomations((await res.json()) as Automation[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setTwoFactorEnabled(Boolean(user?.user_metadata?.two_factor_enabled))
    })
  }, [])

  const openBuilder = () => {
    setBName("")
    setBTrigger(TRIGGERS[0].value)
    setBActions([emptyAction()])
    setBuilderOpen(true)
  }

  const saveAutomation = async () => {
    if (!bName.trim()) { toast.error(isDe ? "Name ist erforderlich." : "Name is required."); return }
    const validActions = bActions.filter((a) => {
      const fieldKey = ACTION_TYPES.find((t) => t.value === a.type)?.field
      return fieldKey && String(a.payload[fieldKey] ?? "").trim()
    })
    if (!validActions.length) { toast.error(isDe ? "Füge mindestens eine vollständige Aktion hinzu." : "Add at least one complete action."); return }
    setBSaving(true)
    const res = await fetch("/api/automations", {
      method: "POST",
      headers: await getHeaders(true),
      credentials: "include",
      body: JSON.stringify({ name: bName.trim(), trigger_event: bTrigger, actions: validActions, enabled: true }),
    })
    if (res.ok) { toast.success(isDe ? "Automation gespeichert" : "Automation saved"); setBuilderOpen(false); await load() }
    else showErr(await readApiError(res, isDe ? "Automation konnte nicht gespeichert werden" : "Could not save automation"))
    setBSaving(false)
  }

  const installPreset = async (preset: Omit<Automation, "id" | "enabled">) => {
    const res = await fetch("/api/automations", {
      method: "POST",
      headers: await getHeaders(true),
      credentials: "include",
      body: JSON.stringify({ ...preset, enabled: true }),
    })
    if (res.ok) { toast.success(isDe ? "Preset installiert" : "Preset installed"); await load() }
    else showErr(await readApiError(res, isDe ? "Preset konnte nicht installiert werden" : "Could not install preset"))
  }

  const toggle = async (item: Automation) => {
    const res = await fetch("/api/automations", {
      method: "PATCH",
      headers: await getHeaders(true),
      credentials: "include",
      body: JSON.stringify({ id: item.id, enabled: !item.enabled }),
    })
    if (res.ok) await load()
    else showErr(await readApiError(res, isDe ? "Konnte nicht aktualisiert werden" : "Could not update"))
  }

  const remove = async (id: string) => {
    if (!window.confirm(isDe ? "Diese Automation löschen?" : "Delete this automation?")) return
    const res = await fetch("/api/automations", {
      method: "DELETE",
      headers: await getHeaders(true),
      credentials: "include",
      body: JSON.stringify({ id }),
    })
    if (res.ok) { toast.success(isDe ? "Gelöscht" : "Deleted"); await load() }
    else showErr(await readApiError(res, isDe ? "Konnte nicht gelöscht werden" : "Could not delete"))
  }

  const updateAction = (index: number, field: string, value: string) => {
    setBActions((prev) => prev.map((a, i) => {
      if (i !== index) return a
      if (field === "type") {
        const fieldKey = ACTION_TYPES.find((t) => t.value === value)?.field || "title"
        return { type: value, payload: { [fieldKey]: "" } }
      }
      return { ...a, payload: { ...a.payload, [field]: value } }
    }))
  }

  const trigger = TRIGGERS.find((t) => t.value === bTrigger)
  const triggerLabel = trigger ? (isDe ? trigger.labelDe : trigger.labelEn) : bTrigger

  return (
    <AuthGuard>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">{isDe ? "Automationen" : "Automations"}</p>
            <h1 className="mt-2 text-3xl font-bold text-foreground">{isDe ? "Workflow-Builder" : "Workflow Builder"}</h1>
            <p className="mt-2 text-sm text-foreground/65">{isDe ? "Automatisiere wiederholbare Aktionen, die durch CRM-Events ausgelöst werden." : "Automate repeatable actions triggered by CRM events."}</p>
          </div>
          <button onClick={openBuilder} className="flex items-center gap-2 rounded-2xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-500">
            <Plus size={15} />{isDe ? "Neue Automation" : "New Automation"}
          </button>
        </div>

        {!twoFactorEnabled ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
            <p className="text-sm font-semibold text-amber-300">{isDe ? "Aktiviere 2FA für zuverlässiges Automations-Management." : "Enable 2FA for reliable automation management."}</p>
            <Link href="/settings#security" className="mt-2 inline-flex rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200">{isDe ? "Sicherheitseinstellungen öffnen" : "Open Security Settings"}</Link>
          </div>
        ) : null}

        {builderOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 px-4 py-10 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-3xl border border-border-subtle bg-surface-1 p-6 shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyan-300"><Zap size={16} /><span className="text-sm font-semibold">{isDe ? "Automation bauen" : "Build Automation"}</span></div>
                <button onClick={() => setBuilderOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-xl border border-border-subtle text-foreground/60 hover:bg-foreground/5"><X size={14} /></button>
              </div>
              <div className="mb-4">
                <label className="mb-1 block text-xs uppercase tracking-[0.2em] text-foreground/50">{isDe ? "Name" : "Name"}</label>
                <input value={bName} onChange={(e) => setBName(e.target.value)} placeholder={isDe ? "z. B. Neuer Lead Follow-up" : "e.g. New lead follow-up"} className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-2.5 text-sm text-foreground outline-none focus:border-cyan-500/50" />
              </div>
              <div className="mb-4">
                <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-foreground/50">{isDe ? "Wenn (Trigger)" : "When (Trigger)"}</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {TRIGGERS.map((t) => (
                    <button key={t.value} onClick={() => setBTrigger(t.value)} className={`rounded-xl border px-4 py-3 text-left text-sm transition ${bTrigger === t.value ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-200" : "border-border-subtle bg-surface-2/60 text-foreground/70 hover:bg-foreground/5"}`}>
                      <p className="font-medium">{isDe ? t.labelDe : t.labelEn}</p>
                      <p className="mt-0.5 text-xs text-foreground/45">{isDe ? t.descriptionDe : t.descriptionEn}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs uppercase tracking-[0.2em] text-foreground/50">{isDe ? "Dann (Aktionen)" : "Then (Actions)"}</label>
                  <button onClick={() => setBActions((prev) => [...prev, emptyAction()])} className="text-xs text-cyan-400 hover:text-cyan-300">{isDe ? "+ Aktion hinzufügen" : "+ Add action"}</button>
                </div>
                <div className="space-y-2">
                  {bActions.map((action, idx) => {
                    const actionDef = ACTION_TYPES.find((t) => t.value === action.type) || ACTION_TYPES[0]
                    const fieldKey = actionDef.field
                    const fieldValue = String(action.payload[fieldKey] ?? "")
                    return (
                      <div key={idx} className="flex items-start gap-2 rounded-xl border border-border-subtle bg-surface-2/70 p-3">
                        <ChevronRight size={14} className="mt-2.5 shrink-0 text-foreground/40" />
                        <div className="flex-1 space-y-2">
                          <select value={action.type} onChange={(e) => updateAction(idx, "type", e.target.value)} className="w-full rounded-lg border border-border-subtle bg-surface-1 px-3 py-2 text-sm text-foreground outline-none">
                            {ACTION_TYPES.map((t) => <option key={t.value} value={t.value}>{isDe ? t.labelDe : t.labelEn}</option>)}
                          </select>
                          <input value={fieldValue} onChange={(e) => updateAction(idx, fieldKey, e.target.value)} placeholder={fieldKey === "title" ? (isDe ? "Task-Titel..." : "Task title...") : fieldKey === "message" ? (isDe ? "Benachrichtigungstext..." : "Notification text...") : (isDe ? "Statuswert..." : "Status value...")} className="w-full rounded-lg border border-border-subtle bg-surface-1 px-3 py-2 text-sm text-foreground outline-none focus:border-cyan-500/40" />
                        </div>
                        {bActions.length > 1 ? <button onClick={() => setBActions((prev) => prev.filter((_, i) => i !== idx))} className="mt-1 shrink-0 text-foreground/40 hover:text-rose-400"><X size={14} /></button> : null}
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="mb-5 rounded-xl border border-border-subtle bg-surface-2/60 px-4 py-3 text-xs text-foreground/60">
                <span className="font-semibold text-foreground/80">{isDe ? "Vorschau:" : "Preview:"} </span>
                {isDe ? "Wenn" : "When"} <span className="text-cyan-300">&quot;{triggerLabel}&quot;</span> {isDe ? "dann" : "then"}{" "}
                {bActions.map((a, i) => {
                  const t = ACTION_TYPES.find((x) => x.value === a.type)
                  const fk = t?.field || "title"
                  const val = String(a.payload[fk] ?? "")
                  return <span key={i}>{i > 0 ? ", " : ""}<span className="text-amber-300">{(t ? (isDe ? t.labelDe : t.labelEn) : a.type)}</span>{val ? `: \"${val}\"` : ""}</span>
                })}
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setBuilderOpen(false)} className="rounded-xl border border-border-subtle px-4 py-2 text-sm text-foreground/65 hover:bg-foreground/5">{isDe ? "Abbrechen" : "Cancel"}</button>
                <button onClick={() => void saveAutomation()} disabled={bSaving} className="rounded-xl bg-cyan-600 px-5 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-60">{bSaving ? (isDe ? "Speichere..." : "Saving...") : (isDe ? "Automation speichern" : "Save Automation")}</button>
              </div>
            </div>
          </div>
        ) : null}

        <section className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">{isDe ? "Schnellinstallations-Presets" : "Quick-install presets"}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PRESETS.map((preset) => (
              <button key={preset.name} onClick={() => void installPreset(preset)} className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-left transition hover:border-cyan-500/40 hover:bg-cyan-500/15">
                <p className="font-semibold text-cyan-200">{preset.name}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-cyan-300/70">{preset.trigger_event}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">{isDe ? `Aktive Automationen (${automations.length})` : `Active automations (${automations.length})`}</h2>
          {loading ? (
            <p className="text-sm text-foreground/60">{isDe ? "Lade..." : "Loading..."}</p>
          ) : automations.length === 0 ? (
            <p className="text-sm text-foreground/50">{isDe ? "Noch keine Automationen. Nutze ein Preset oder baue deine eigene." : "No automations yet. Use a preset or build your own."}</p>
          ) : (
            <div className="space-y-2">
              {automations.map((item) => (
                <article key={item.id} className="flex items-start justify-between gap-4 rounded-xl border border-border-subtle bg-surface-2/60 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{item.name}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${item.enabled ? "bg-emerald-500/15 text-emerald-300" : "bg-foreground/10 text-foreground/50"}`}>{item.enabled ? (isDe ? "An" : "On") : (isDe ? "Aus" : "Off")}</span>
                    </div>
                    <p className="mt-1 text-xs text-foreground/50">{isDe ? "Trigger" : "Trigger"}: <span className="text-foreground/70">{item.trigger_event}</span> · {item.actions.length} {isDe ? (item.actions.length !== 1 ? "Aktionen" : "Aktion") : `action${item.actions.length !== 1 ? "s" : ""}`}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button onClick={() => void toggle(item)} className="rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-medium text-foreground/70 transition hover:bg-foreground/5">{item.enabled ? (isDe ? "Deaktivieren" : "Disable") : (isDe ? "Aktivieren" : "Enable")}</button>
                    <button onClick={() => void remove(item.id)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-subtle text-foreground/40 transition hover:border-rose-500/40 hover:text-rose-400"><Trash2 size={13} /></button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AuthGuard>
  )
}