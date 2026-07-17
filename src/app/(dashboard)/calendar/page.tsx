"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import toast from "react-hot-toast"
import AuthGuard from "@/components/AuthGuard"
import { useAppPreferences } from "@/components/AppPreferencesProvider"
import { supabase } from "@/lib/supabase/client"
import { Plus, X, Calendar, CheckSquare, Phone, Mail, Users } from "lucide-react"

type CalendarEvent = {
  id: string
  type: "activity" | "task"
  activityType: string
  title: string
  description: string | null
  date: string
  leadId: string | null
  priority?: string
  completed?: boolean
}

const typeIcon: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  meeting: Users,
  call_completed: Phone,
  email_sent: Mail,
  task: CheckSquare,
}

const typeColor: Record<string, string> = {
  meeting:       "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  call_completed:"border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  email_sent:    "border-violet-500/30 bg-violet-500/10 text-violet-300",
  task:          "border-amber-500/30 bg-amber-500/10 text-amber-300",
}

const groupByDate = (events: CalendarEvent[]) => {
  const map = new Map<string, CalendarEvent[]>()
  for (const e of events) {
    const day = e.date.slice(0, 10)
    if (!map.has(day)) map.set(day, [])
    map.get(day)!.push(e)
  }
  return map
}

const formatDate = (iso: string, locale: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" })
}

const formatTime = (iso: string, locale: string, isDe: boolean) => {
  const d = new Date(iso)
  const h = d.getHours()
  const m = d.getMinutes()
  if (h === 0 && m === 0) return isDe ? "Ganztags" : "All day"
  return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
}

export default function CalendarPage() {
  const { language } = useAppPreferences()
  const isDe = language === "de"
  const locale = isDe ? "de-DE" : "en-US"

  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 16))
  const [newDesc, setNewDesc] = useState("")
  const [creating, setCreating] = useState(false)

  const getHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const h: Record<string, string> = { "Content-Type": "application/json" }
    if (session?.access_token) h.Authorization = `Bearer ${session.access_token}`
    return h
  }

  const load = async () => {
    setLoading(true)
    const response = await fetch("/api/calendar/events", {
      headers: await getHeaders(),
      credentials: "include",
    })
    if (response.ok) {
      const data = (await response.json()) as { events: CalendarEvent[] }
      setEvents(Array.isArray(data.events) ? data.events : [])
    }
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const createMeeting = async () => {
    if (!newTitle.trim()) { toast.error(isDe ? "Titel ist erforderlich." : "Title is required."); return }
    setCreating(true)
    const response = await fetch("/api/calendar/events", {
      method: "POST",
      headers: await getHeaders(),
      credentials: "include",
      body: JSON.stringify({
        title: newTitle.trim(),
        scheduled_at: new Date(newDate).toISOString(),
        description: newDesc.trim() || null,
      }),
    })
    if (response.ok) {
      toast.success(isDe ? "Termin erstellt." : "Meeting created.")
      setShowNew(false)
      setNewTitle("")
      setNewDesc("")
      await load()
    } else {
      const d = (await response.json()) as { error?: string }
      toast.error(d.error || (isDe ? "Termin konnte nicht erstellt werden." : "Could not create meeting."))
    }
    setCreating(false)
  }

  const grouped = groupByDate(events)
  const sortedDays = Array.from(grouped.keys()).sort()
  const today = new Date().toISOString().slice(0, 10)

  return (
    <AuthGuard>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">{isDe ? "Kalender" : "Calendar"}</p>
            <h1 className="mt-2 text-3xl font-bold text-foreground">{isDe ? "Termine & Ereignisse" : "Meetings & Events"}</h1>
            <p className="mt-1 text-sm text-foreground/60">{events.length} {isDe ? "bevorstehende Ereignisse" : "upcoming events"}</p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 rounded-2xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-500"
          >
            <Plus size={15} />
            {isDe ? "Neuer Termin" : "New Meeting"}
          </button>
        </div>

        {/* New meeting modal */}
        {showNew ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-border-subtle bg-surface-1 p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyan-300">
                  <Calendar size={16} />
                  <span className="text-sm font-semibold">{isDe ? "Termin planen" : "Schedule Meeting"}</span>
                </div>
                <button onClick={() => setShowNew(false)} className="flex h-7 w-7 items-center justify-center rounded-xl border border-border-subtle text-foreground/60 hover:bg-foreground/5">
                  <X size={14} />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-[0.2em] text-foreground/50">{isDe ? "Titel" : "Title"}</label>
                  <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder={isDe ? "Discovery-Call mit Acme GmbH" : "Discovery call with Acme Corp"} className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-2.5 text-sm text-foreground outline-none focus:border-cyan-500/50" />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-[0.2em] text-foreground/50">{isDe ? "Datum & Uhrzeit" : "Date & Time"}</label>
                  <input type="datetime-local" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-2.5 text-sm text-foreground outline-none focus:border-cyan-500/50" />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-[0.2em] text-foreground/50">{isDe ? "Notizen (optional)" : "Notes (optional)"}</label>
                  <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={3} className="w-full resize-none rounded-xl border border-border-subtle bg-surface-2 px-4 py-2.5 text-sm text-foreground outline-none focus:border-cyan-500/50" />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setShowNew(false)} className="rounded-xl border border-border-subtle px-4 py-2 text-sm text-foreground/65 hover:bg-foreground/5">{isDe ? "Abbrechen" : "Cancel"}</button>
                <button onClick={() => void createMeeting()} disabled={creating} className="rounded-xl bg-cyan-600 px-5 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-60">
                  {creating ? (isDe ? "Speichern..." : "Saving...") : (isDe ? "Termin speichern" : "Save Meeting")}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {loading ? <p className="text-sm text-foreground/60">{isDe ? "Kalender wird geladen..." : "Loading calendar..."}</p> : null}

        {!loading && events.length === 0 ? (
          <div className="rounded-2xl border border-border-subtle bg-surface-1 p-10 text-center text-sm text-foreground/55">
            {isDe ? "Keine Ereignisse in den nächsten 60 Tagen. Plane einen Termin oder füge Aufgaben mit Fälligkeitsdatum hinzu." : "No events in the next 60 days. Schedule a meeting or add tasks with due dates."}
          </div>
        ) : null}

        <div className="space-y-6">
          {sortedDays.map((day) => {
            const dayEvents = grouped.get(day) || []
            const isToday = day === today
            const isPast = day < today

            return (
              <div key={day}>
                <div className={`mb-3 flex items-center gap-3`}>
                  <span className={`text-sm font-semibold ${isToday ? "text-cyan-300" : isPast ? "text-foreground/40" : "text-foreground"}`}>
                    {isToday ? (isDe ? "Heute - " : "Today - ") : ""}{formatDate(day, locale)}
                  </span>
                  {isToday ? <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">{isDe ? "Heute" : "Today"}</span> : null}
                </div>
                <div className="space-y-2">
                  {dayEvents.map((event) => {
                    const Icon = typeIcon[event.activityType] || Calendar
                    const colorClass = typeColor[event.activityType] || typeColor.task
                    return (
                      <div key={event.id} className={`flex items-start gap-4 rounded-2xl border px-5 py-3.5 ${colorClass} ${isPast ? "opacity-60" : ""}`}>
                        <Icon size={16} className="mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-foreground ${event.completed ? "line-through opacity-50" : ""}`}>{event.title}</p>
                          {event.description ? <p className="mt-0.5 text-xs text-foreground/60 line-clamp-1">{event.description}</p> : null}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <span className="text-xs text-foreground/50">{formatTime(event.date, locale, isDe)}</span>
                          {event.leadId ? (
                            <Link href={`/leads/${event.leadId}`} className="text-[11px] text-foreground/50 underline-offset-2 hover:underline">
                              {isDe ? "Lead anzeigen" : "View lead"}
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AuthGuard>
  )
}
