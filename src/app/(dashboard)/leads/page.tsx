"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import AuthGuard from "@/components/AuthGuard"
import { useAppPreferences } from "@/components/AppPreferencesProvider"
import LeadFilters from "@/components/dashboard/LeadFilters"
import { supabase } from "@/lib/supabase/client"
import { getHealthScore, getPriorityScore, getStaleDays } from "@/lib/scoring"
import { useLeadsData } from "@/hooks/useLeadsData"
import LeadPipeline from "@/components/dashboard/LeadPipeline"
import HealthRing from "@/components/dashboard/HealthRing"
import PriorityBadge from "@/components/dashboard/PriorityBadge"
import LeadActions from "@/components/dashboard/LeadActions"
import { leadDisplayName, leadCompany } from "@/lib/utils"
import { calculateSalesScore } from "@/lib/salesScore"
import { loadDemoData } from "@/lib/demoData"
import type { LeadSource, LeadStatus } from "@/types"
import { Star } from "lucide-react"
import * as XLSX from "xlsx"

type ImportIssue = {
  row: number
  reason: string
  name?: string
  company?: string
  status?: string
  value?: string
  email?: string
  phone?: string
  website?: string
  address?: string
  source?: string
  tags?: string
  notes?: string
}

const LEAD_FAVORITES_STORAGE_KEY = "closeflow_lead_favorites"

const escapeCsv = (value: unknown) => {
  const text = String(value ?? "")
  if (text.includes(",") || text.includes("\n") || text.includes('"')) {
    return `"${text.replaceAll('"', '""')}"`
  }
  return text
}


export default function LeadsPage() {
  const { leads, setLeads, loading, error, refresh } = useLeadsData({ activityLimit: 0 })
  const { language } = useAppPreferences()
  const isDe = language === "de"
  const locale = isDe ? "de-DE" : "en-US"
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [priority, setPriority] = useState("all")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [dateRange, setDateRange] = useState("all")
  const [ownerFilter, setOwnerFilter] = useState("all")
  const [sortBy, setSortBy] = useState<"created_at" | "value" | "priority">("priority")
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [company, setCompany] = useState("")
  const [value, setValue] = useState("")
  const [notes, setNotes] = useState("")
  const [leadStatus, setLeadStatus] = useState<LeadStatus>("new")
  const [leadSource, setLeadSource] = useState<LeadSource>("website")
  const [tagsInput, setTagsInput] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [website, setWebsite] = useState("")
  const [nextAction, setNextAction] = useState("")
  const [nextActionDate, setNextActionDate] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [view, setView] = useState<"list" | "pipeline">("list")
  const [favorites, setFavorites] = useState<string[]>([])
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoMessage, setDemoMessage] = useState<string | null>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [importingCsv, setImportingCsv] = useState(false)
  const [importIssues, setImportIssues] = useState<ImportIssue[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!importMessage) return

    const timer = window.setTimeout(() => {
      setImportMessage(null)
    }, 10000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [importMessage])
 

  useEffect(() => {
    const storedFavorites = window.localStorage.getItem(LEAD_FAVORITES_STORAGE_KEY)

    if (!storedFavorites) {
      return
    }

    try {
      const parsed = JSON.parse(storedFavorites) as unknown
      if (Array.isArray(parsed)) {
        setFavorites(parsed.filter((value): value is string => typeof value === "string"))
      }
    } catch {
      window.localStorage.removeItem(LEAD_FAVORITES_STORAGE_KEY)
    }
  }, [])

  const toggleFavorite = (id: string) => {
    setFavorites((current) => {
      const nextFavorites = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]

      window.localStorage.setItem(LEAD_FAVORITES_STORAGE_KEY, JSON.stringify(nextFavorites))

      return nextFavorites
    })
  }

  useEffect(() => {
    const loadCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      setCurrentUserId(user?.id || null)
    }

    void loadCurrentUser()
  }, [])

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase()
    const now = Date.now()
    const dayMs = 1000 * 60 * 60 * 24

    return [...leads]
      .filter((lead) => {
        const leadOwnerId = lead.owner_id || lead.assigned_to || lead.user_id || null
        const searchableText = `${leadDisplayName(lead)} ${leadCompany(lead)} ${lead.email || ""} ${lead.phone || ""}`.toLowerCase()
        const createdAtMs = new Date(lead.created_at).getTime()

        const matchesQuery = !query || searchableText.includes(query)
        const matchesStatus = status === "all" || lead.status === status
        const score = getPriorityScore(lead)
        const priorityLabel = score >= 75 ? "hot" : score >= 45 ? "warm" : "cold"
        const matchesPriority = priority === "all" || priorityLabel === priority
        const matchesSource = sourceFilter === "all" || (lead.source || "other") === sourceFilter
        const matchesOwner =
          ownerFilter === "all" ||
          (ownerFilter === "mine" && !!currentUserId && leadOwnerId === currentUserId) ||
          (ownerFilter === "unassigned" && !leadOwnerId)

        const ageInDays = (now - createdAtMs) / dayMs
        const matchesDateRange =
          dateRange === "all" ||
          (dateRange === "today" && ageInDays < 1) ||
          (dateRange === "last7" && ageInDays <= 7) ||
          (dateRange === "last30" && ageInDays <= 30) ||
          (dateRange === "older30" && ageInDays > 30)

        return matchesQuery && matchesStatus && matchesPriority && matchesSource && matchesOwner && matchesDateRange
      })
      .sort((a, b) => {
        const aPinned = favorites.includes(a.id)
        const bPinned = favorites.includes(b.id)

        if (aPinned !== bPinned) {
          return aPinned ? -1 : 1
        }

        if (sortBy === "value") return (b.value || 0) - (a.value || 0)
        if (sortBy === "created_at") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        return getPriorityScore(b) - getPriorityScore(a)
      })
  }, [currentUserId, dateRange, favorites, leads, ownerFilter, priority, search, sortBy, sourceFilter, status])

  const getAuthHeaders = async (includeJson = false) => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const headers: Record<string, string> = {}

    if (includeJson) {
      headers["Content-Type"] = "application/json"
    }

    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`
    }

    return headers
  }

  const downloadExport = async (format: "csv" | "xlsx") => {
    const response = await fetch(`/api/leads/export?format=${format}`, {
      headers: await getAuthHeaders(),
      credentials: "include",
    })
    if (!response.ok) {
      let message = isDe ? `${format.toUpperCase()}-Export fehlgeschlagen.` : `${format.toUpperCase()} export failed.`
      try {
        const data = (await response.json()) as { error?: string }
        if (data.error) message = data.error
      } catch {
        const text = await response.text()
        if (text) message = text
      }
      setDemoMessage(message)
      return
    }

    const buffer = await response.arrayBuffer()
    const blob = new Blob([buffer], {
      type:
        format === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "text/csv;charset=utf-8;",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `closeflow-leads-${new Date().toISOString().slice(0, 10)}.${format}`
    link.click()
    URL.revokeObjectURL(url)
  }

  const importFile = async (file: File) => {
    setImportingCsv(true)
    setImportMessage(null)
    setDemoMessage(null)
    setImportIssues([])

    try {
      const lowerName = file.name.toLowerCase()
      const csvText = lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")
        ? (() => {
            const parseWorkbook = async () => {
              const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" })
              const firstSheet = workbook.SheetNames[0]
              if (!firstSheet) {
                throw new Error(isDe ? "Import fehlgeschlagen: Arbeitsmappe enthaelt keine Tabellenblaetter." : "Import failed: workbook has no sheets.")
              }
              return XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheet])
            }
            return parseWorkbook()
          })()
        : file.text()

      const resolvedCsvText = await csvText
      const response = await fetch("/api/leads/import", {
        method: "POST",
        headers: await getAuthHeaders(true),
        credentials: "include",
        body: JSON.stringify({ csv: resolvedCsvText }),
      })

      if (!response.ok) {
        const text = await response.text()
        setDemoMessage(text || (isDe ? "CSV-Import fehlgeschlagen." : "CSV import failed."))
        return
      }

      const data = (await response.json()) as { inserted?: number; skipped?: number; issues?: ImportIssue[] }
      const issues = Array.isArray(data.issues) ? data.issues : []
      setImportIssues(issues)
      setImportMessage(
        isDe
          ? `Import abgeschlossen. ${data.inserted || 0} Leads hinzugefügt, ${data.skipped || 0} übersprungen${issues.length ? `. ${issues.length} Problem(e) im Bericht verfügbar.` : "."}`
          : `Import done. Added ${data.inserted || 0} leads, skipped ${data.skipped || 0}${issues.length ? `. ${issues.length} issue(s) available in report.` : "."}`
      )
      
      await refresh()
    } catch (error) {
      setDemoMessage(error instanceof Error ? error.message : (isDe ? "Import fehlgeschlagen." : "Import failed."))
    } finally {
      setImportingCsv(false)
    }
  }

  const downloadImportIssuesReport = () => {
    if (!importIssues.length) return

    const headers = [
  "row",
  "reason",
  "name",
  "company",
  "status",
  "value",
  "email",
  "phone",
  "website",
  "address",
  "source",
  "tags",
  "notes",
]
    const rows = importIssues.map((issue) => [
      issue.row,
      issue.reason,
      issue.name || "",
      issue.company || "",
      issue.status || "",
      issue.value || "",
      issue.email || "",
      issue.phone || "",
      issue.website || "",
      issue.address || "",
      issue.source || "",
      issue.tags || "",
      issue.notes || "",
    ])

    const csv = [
      headers.join(";"),
      ...rows.map((row) => row.map(escapeCsv).join(";")),
    ].join("\r\n")

    const blob = new Blob(
      ["\uFEFF" + csv],
      { type: "text/csv;charset=utf-8;" }
    )
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `closeflow-leads-import-issues-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const createLead = async () => {
    setFormError(null)
    setSubmitting(true)

    if (!name.trim()) {
  setFormError(isDe ? "Lead-Name ist erforderlich" : "Lead name is required")
  setSubmitting(false)
  return
}

if (!company.trim()) {
  setFormError(isDe ? "Firmenname ist erforderlich" : "Company name is required")
  setSubmitting(false)
  return
}

const dealValue = Number(value)
const parsedTags = tagsInput
  .split(",")
  .map((tag) => tag.trim())
  .filter(Boolean)

if (isNaN(dealValue) || dealValue < 0) {
  setFormError(isDe ? "Deal-Wert muss eine gültige Zahl sein" : "Deal value must be a valid number")
  setSubmitting(false)
  return
}

const normalizedName = name.trim().toLowerCase()
const normalizedCompany = company.trim().toLowerCase()

const duplicateLead = leads.find((lead) => {
  const sameName = (lead.name || "").trim().toLowerCase() === normalizedName
  const sameCompany = (lead.company || "").trim().toLowerCase() === normalizedCompany
  return sameName && sameCompany
})

if (duplicateLead) {
  setFormError(isDe ? "Doppelter Lead erkannt: Name und Firma existieren bereits." : "Duplicate lead detected: same name and company already exist.")
  setSubmitting(false)
  return
}

const baseInsertPayload = {
  name: name.trim(),
  company: company.trim(),
  status: leadStatus,
  value: dealValue,
  notes: notes.trim() || "",
  stage_changed_at: new Date().toISOString(),
  last_activity_at: new Date().toISOString(),
}

const extendedInsertPayload = {
  ...baseInsertPayload,
  source: leadSource,
  tags: parsedTags,
  email: email.trim() || null,
  phone: phone.trim() || null,
  address: address.trim() || null,
  website: website.trim() || null,
  next_action: nextAction.trim() || null,
  next_action_date: nextActionDate
    ? new Date(nextActionDate).toISOString()
    : null,
}

const response = await fetch("/api/leads", {
  method: "POST",
  headers: await getAuthHeaders(true),
  credentials: "include",
  body: JSON.stringify(extendedInsertPayload),
})

if (!response.ok) {
  let message = isDe ? "Lead konnte nicht erstellt werden." : "Failed to create lead."
  try {
    const payload = (await response.json()) as { error?: string }
    if (payload.error) {
      message = payload.error
    }
  } catch {
    const text = await response.text()
    if (text) {
      message = text
    }
  }

  setFormError(message)
  setSubmitting(false)
  return
}

    setName("")
    setCompany("")
    setValue("")
    setNotes("")
    setLeadSource("website")
    setTagsInput("")
    setEmail("")
    setPhone("")
    setAddress("")
    setWebsite("")
    setNextAction("")
    setNextActionDate("")
    setLeadStatus("new")
    setShowForm(false)
    setSubmitting(false)
    await refresh()
  }

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">{isDe ? "Pipeline" : "Pipeline"}</p>
            <h1 className="text-3xl font-bold text-foreground">{isDe ? "Leads" : "Leads"}</h1>
            <p className="mt-2 text-sm text-foreground/65">{isDe ? "Suche, filtere, sortiere und arbeite die richtigen Opportunities nach." : "Search, filter, sort, and follow up on the right opportunities."}</p>
          </div>

          <div className="flex gap-3">

            <div className="flex rounded-xl border border-border-subtle bg-surface-1 p-1">

              <button
                onClick={() => setView("list")}
                className={`px-4 py-2 rounded-lg text-sm ${
                  view === "list"
                    ? "bg-foreground text-background"
                    : "text-foreground/65"
                }`}
              >
                {isDe ? "Liste" : "List"}
              </button>

              <button
                onClick={() => setView("pipeline")}
                className={`px-4 py-2 rounded-lg text-sm ${
                  view === "pipeline"
                    ? "bg-foreground text-background"
                    : "text-foreground/65"
                }`}
              >
                Pipeline
              </button>

            </div>


            <button
              onClick={() => setShowForm(true)}
              className="rounded-xl bg-foreground px-4 py-2 font-medium text-background"
            >
              {isDe ? "+ Lead hinzufügen" : "+ Add Lead"}
            </button>

            <button
              onClick={() => void downloadExport("csv")}
              className="rounded-xl border border-border-subtle bg-surface-1 px-4 py-2 font-medium text-foreground/85"
            >
              {isDe ? "CSV exportieren" : "Export CSV"}
            </button>

            <button
              onClick={() => void downloadExport("xlsx")}
              className="rounded-xl border border-border-subtle bg-surface-1 px-4 py-2 font-medium text-foreground/85"
            >
              {isDe ? "Excel exportieren" : "Export Excel"}
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importingCsv}
              className="rounded-xl border border-border-subtle bg-surface-1 px-4 py-2 font-medium text-foreground/85 disabled:opacity-60"
            >
              {importingCsv ? (isDe ? "Importiere..." : "Importing...") : (isDe ? "Datei importieren" : "Import File")}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) {
                  void importFile(file)
                }
                event.currentTarget.value = ""
              }}
            />

            {importIssues.length ? (
              <button
                onClick={downloadImportIssuesReport}
                className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 font-medium text-amber-200"
              >
                {isDe ? "Importprobleme herunterladen" : "Download Import Issues"}
              </button>
            ) : null}

          </div>
          
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
            {isDe ? "Leads konnten nicht geladen werden." : "We couldn’t load your leads."} {error}
          </div>
        ) : null}

        <LeadFilters
          search={search}
          status={status}
          priority={priority}
          source={sourceFilter}
          dateRange={dateRange}
          owner={ownerFilter}
          sortBy={sortBy}
          onSearchChange={setSearch}
          onStatusChange={setStatus}
          onPriorityChange={setPriority}
          onSourceChange={setSourceFilter}
          onDateRangeChange={setDateRange}
          onOwnerChange={setOwnerFilter}
          onSortChange={setSortBy}
        />

        <div className="grid gap-4 md:grid-cols-4">

          <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
            <p className="text-sm text-foreground/65">{isDe ? "Leads gesamt" : "Total Leads"}</p>
            <p className="mt-2 text-3xl font-bold text-foreground">
              {filteredLeads.length}
            </p>
          </div>

          <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
            <p className="text-sm text-foreground/65">{isDe ? "Pipeline-Wert" : "Pipeline Value"}</p>
            <p className="mt-2 text-3xl font-bold text-emerald-400">
              €
              {filteredLeads
                .reduce((sum, lead) => sum + (lead.value || 0), 0)
                .toLocaleString(locale)}
            </p>
          </div>

          <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
            <p className="text-sm text-foreground/65">{isDe ? "Durchschnittliche Gesundheit" : "Average Health"}</p>
            <p className="mt-2 text-3xl font-bold text-cyan-400">
              {Math.round(
                filteredLeads.reduce(
                  (sum, lead) => sum + getHealthScore(lead),
                  0
                ) / Math.max(filteredLeads.length, 1)
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
            <p className="text-sm text-foreground/65">{isDe ? "Forecast-Umsatz" : "Forecast Revenue"}</p>

            <p className="mt-2 text-3xl font-bold text-purple-400">
              €
              {filteredLeads
                .reduce((sum, lead) => {
                  const priority = getPriorityScore(lead)
                  const health = getHealthScore(lead)

                  const probability = Math.min(
                    95,
                    Math.round(
                      priority * 0.35 +
                      health * 0.35 +
                      (
                        lead.status === "won"
                          ? 100
                          : lead.status === "proposal"
                          ? 25
                          : lead.status === "contacted"
                          ? 10
                          : 0
                      )
                    )
                  )

                  return sum + (lead.value * probability) / 100
                }, 0)
                .toLocaleString(locale, {
                  maximumFractionDigits: 0,
                })}
            </p>
          </div>

        </div>

        {importMessage ? (
  <div className="w-full rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
    {importMessage}
  </div>
) : null}

        {showForm ? (
          <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6 shadow-sm shadow-black/10">
            {formError ? <p className="mb-3 text-sm text-rose-300">{formError}</p> : null}

            <div className="grid gap-4 md:grid-cols-2">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Name"
                className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-2 text-foreground outline-none"
              />

              <input
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                placeholder={isDe ? "Firma" : "Company"}
                className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-2 text-foreground outline-none"
              />

              <input
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder={isDe ? "Wert" : "Value"}
                type="number"
                className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-2 text-foreground outline-none"
              />

              <select
                value={leadStatus}
                onChange={(event) => setLeadStatus(event.target.value as LeadStatus)}
                className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-2 text-foreground outline-none"
              >
                <option value="new">{isDe ? "Neu" : "New"}</option>
                <option value="contacted">{isDe ? "Kontaktiert" : "Contacted"}</option>
                <option value="qualified">{isDe ? "Qualifiziert" : "Qualified"}</option>
                <option value="proposal">{isDe ? "Angebot" : "Proposal"}</option>
                <option value="won">{isDe ? "Gewonnen" : "Won"}</option>
                <option value="lost">{isDe ? "Verloren" : "Lost"}</option>
              </select>

              <select
                value={leadSource}
                onChange={(event) => setLeadSource(event.target.value as LeadSource)}
                className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-2 text-foreground outline-none"
              >
                <option value="website">{isDe ? "Website" : "Website"}</option>
                <option value="recommendation">{isDe ? "Empfehlung" : "Recommendation"}</option>
                <option value="phone">{isDe ? "Telefon" : "Phone"}</option>
                <option value="advertising">{isDe ? "Werbung" : "Advertising"}</option>
                <option value="other">{isDe ? "Sonstiges" : "Other"}</option>
              </select>

              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
                type="email"
                className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-2 text-foreground outline-none"
              />

              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Phone"
                className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-2 text-foreground outline-none"
              />

              <input
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                placeholder="Website"
                className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-2 text-foreground outline-none"
              />

              <input
                value={tagsInput}
                onChange={(event) => setTagsInput(event.target.value)}
                placeholder={isDe ? "Tags (durch Komma getrennt)" : "Tags (comma separated)"}
                className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-2 text-foreground outline-none"
              />

              <input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder={isDe ? "Adresse" : "Address"}
                className="md:col-span-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-2 text-foreground outline-none"
              />

              <input
                value={nextAction}
                onChange={(event) => setNextAction(event.target.value)}
                placeholder={
                  isDe
                    ? "Nächste Aktion"
                    : "Next action"
                }
                className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-2 text-foreground outline-none"
              />

              <input
                value={nextActionDate}
                onChange={(event) => setNextActionDate(event.target.value)}
                type="datetime-local"
                className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-2 text-foreground outline-none"
              />
              <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={isDe ? "Notizen zu diesem Lead..." : "Notes about this lead..."}
              className="md:col-span-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-2 text-foreground outline-none"
            />
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => void createLead()}
                disabled={submitting}
                className="rounded-xl bg-foreground px-4 py-2 font-medium text-background disabled:opacity-60"
              >
                {submitting ? (isDe ? "Erstelle..." : "Creating...") : (isDe ? "Lead erstellen" : "Create lead")}
              </button>

              <button
                onClick={() => {
                  setShowForm(false)
                  setFormError(null)
                }}
                className="rounded-xl border border-border-subtle bg-surface-2 px-4 py-2 text-foreground/80"
              >
                {isDe ? "Abbrechen" : "Abbrechen"}
              </button>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="
                  rounded-2xl
                  border
                  border-border-subtle
                  bg-surface-1
                  p-5
                  animate-pulse
                "
              >
                <div className="flex gap-4">
                  <div className="
                    h-14
                    w-14
                    rounded-full
                    bg-foreground/10
                  "/>

                  <div className="flex-1 space-y-3">
                    <div className="
                      h-4
                      w-40
                      rounded
                      bg-foreground/10
                    "/>

                    <div className="
                      h-3
                      w-24
                      rounded
                      bg-foreground/10
                    "/>

                    <div className="
                      h-3
                      w-32
                      rounded
                      bg-foreground/10
                    "/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="
          rounded-2xl
          border
          border-border-subtle
          bg-gradient-to-br
          from-surface-1
          to-surface-2
          p-10
          text-center
          ">
            <div className="mx-auto h-10 w-10 rounded-full border border-cyan-500/30 bg-cyan-500/10" />

            <h3 className="
            mt-4
            text-xl
            font-semibold
            text-foreground
            ">
            {isDe ? "Noch keine Leads" : "No leads yet"}
            </h3>

            <p className="
            mt-2
            text-sm
            text-foreground/65
            ">
            {isDe ? "Erstelle deine erste Opportunity und starte den Aufbau deiner Pipeline." : "Create your first opportunity and start building your pipeline."}
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => setShowForm(true)}
                className="rounded-xl bg-foreground px-5 py-2 font-medium text-background"
              >
                {isDe ? "Ersten Lead erstellen" : "Create first lead"}
              </button>
              <button
                onClick={async () => {
                  setDemoLoading(true)
                  setDemoMessage(null)
                  try {
                    const result = await loadDemoData()
                    const warning = result.warnings?.length ? ` ${isDe ? "Warnungen" : "Warnings"}: ${result.warnings.join(" ")}` : ""
                    setDemoMessage(
                      `${result.message} ${isDe ? "Leads" : "Leads"}: ${result.inserted_leads}, ${isDe ? "Aktivitäten" : "Activities"}: ${result.inserted_activities}, ${isDe ? "Aufgaben" : "Tasks"}: ${result.inserted_tasks}.${warning}`
                    )
                    await refresh()
                  } catch (error) {
                    setDemoMessage(error instanceof Error ? error.message : (isDe ? "Demo-Daten konnten nicht geladen werden" : "Could not load demo data"))
                  } finally {
                    setDemoLoading(false)
                  }
                }}
                disabled={demoLoading}
                className="rounded-xl border border-border-subtle bg-surface-2/70 px-5 py-2 font-medium text-foreground/80 transition hover:bg-foreground/5 disabled:opacity-60"
              >
                {demoLoading ? (isDe ? "Lade Demo-Daten..." : "Loading demo data...") : (isDe ? "Demo-Daten laden" : "Load demo data")}
              </button>
            </div>
            {demoMessage ? <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{demoMessage}</div> : null}
          </div>
        ) : (
          view === "list" ? (

          <div className="space-y-3">
            {filteredLeads.map((lead) => {
              
              const staleDays = getStaleDays(lead)

              const salesScore = calculateSalesScore(
                lead,
                staleDays
              )

              const priority = salesScore.priority
              const health = salesScore.health
              const probability = salesScore.probability

              return (
                <div
                  key={lead.id}
                  onClick={() => router.push(`/leads/${lead.id}`)}
                  className="
                    cursor-pointer
                    block
                    rounded-2xl
                    border
                    border-border-subtle
                    bg-gradient-to-br
                    from-surface-1
                    to-surface-2
                    p-5
                    transition
                    hover:-translate-y-1
                    hover:shadow-xl
                    hover:shadow-cyan-500/10
                    hover:bg-foreground/5
                  "
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-4">

                              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-lg font-bold text-white shadow-lg">
                                {leadDisplayName(lead)
                                  .split(" ")
                                  .map((part) => part[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </div>

                              <div>
                                <div className="flex items-center gap-2">

                                  <p className="font-semibold text-lg text-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-[180px] md:max-w-[300px]">
                                    {leadDisplayName(lead)}
                                  </p>

                          <button
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              toggleFavorite(lead.id)
                            }}
                            aria-label={favorites.includes(lead.id) ? (isDe ? "Fixierung entfernen" : "Remove pin") : (isDe ? "Lead fixieren" : "Pin lead")}
                            title={favorites.includes(lead.id) ? (isDe ? "Fixiert" : "Pinned") : (isDe ? "Fixieren" : "Pin")}
                            className="rounded-full p-1.5 text-foreground/45 transition hover:bg-foreground/5 hover:text-amber-300"
                          >
                            <Star
                              size={18}
                              className={favorites.includes(lead.id) ? "fill-amber-300 text-amber-300" : "text-foreground/45"}
                            />
                          </button>

                        </div>

                        <p className="text-sm text-foreground/65">
                          {leadCompany(lead)}
                        </p>

                        <p className="mt-2 text-sm font-semibold text-foreground">
                          €{lead.value.toLocaleString(locale)}
                        </p>

                        <span
                          className={`inline-flex mt-2 rounded-full px-3 py-1 text-xs font-medium ${
                            lead.status === "new"
                              ? "bg-blue-500/20 text-blue-300"
                              : lead.status === "contacted"
                              ? "bg-yellow-500/20 text-yellow-300"
                              : lead.status === "qualified"
                              ? "bg-cyan-500/20 text-cyan-300"
                              : lead.status === "proposal"
                              ? "bg-orange-500/20 text-orange-300"
                              : lead.status === "won"
                              ? "bg-green-500/20 text-green-300"
                              : "bg-red-500/20 text-red-300"
                          }`}
                        >
                          {lead.status}
                          {probability > 80 && (
                            <span className="
                              ml-2
                              rounded-full
                              bg-orange-500/20
                              px-3
                              py-1
                              text-xs
                              font-medium
                              text-orange-300
                            ">
                              {isDe ? "Hohe Priorität" : "High Priority"}
                            </span>
                          )}
                        </span>
                      </div>

                    </div>

                    <div className="flex flex-wrap gap-3 text-right md:justify-end">
                      <PriorityBadge score={priority} />
                      <HealthRing value={health} />
                      <div>
                      <p className="text-xs text-zinc-400">
                        {isDe ? "Abschlusschance" : "Close chance"}
                      </p>

                      <p className="text-lg font-bold text-cyan-400">
                        {probability}%
                      </p>
                    </div>

                    <div className="
                    rounded-xl
                    border
                    border-purple-500/20
                    bg-purple-500/10
                    px-4
                    py-3
                    ">

                    <p className="text-xs text-purple-300">
                    {isDe ? "KI-Signal" : "AI Signal"}
                    </p>

                    <p className="mt-1 text-sm font-semibold text-foreground">
                    {
                    staleDays > 14
                    ? (isDe ? "Braucht Aufmerksamkeit" : "Needs attention")
                    : probability > 80
                    ? (isDe ? "Starkes Abschluss-Signal" : "Strong closing signal")
                    : probability > 60
                    ? (isDe ? "Positives Momentum" : "Positive momentum")
                    : (isDe ? "Weitere Pflege noetig" : "Nurturing required")
                    }
                    </p>

                    </div>
                      <div className="mt-4 rounded-xl border border-border-subtle bg-surface-2/70 p-3 text-left">

                        <p className="text-xs text-foreground/55">
                          {isDe ? "Nächste Aktion" : "Next action"}
                        </p>

                        <p className="mt-1 text-sm text-foreground">
                          {lead.next_action || (isDe ? "Keine Aktion geplant" : "No action planned")}
                        </p>


                        {lead.next_action_date && (
                          <p
                            className={`mt-1 text-xs ${
                              new Date(lead.next_action_date) < new Date()
                                ? "text-red-400"
                                : "text-emerald-400"
                            }`}
                          >
                            {isDe ? "Faellig" : "Due"} {new Date(
                              lead.next_action_date
                            ).toLocaleDateString(locale)}
                          </p>
                        )}

                      </div>

                      <div className="mt-2 text-xs text-foreground/55">
                       <div className="mt-3 flex items-center gap-2 text-xs">

                      <span className="text-foreground/65">
                      {isDe ? "Letzte Aktivität:" : "Last activity:"}
                      </span>

                      <span
                      className={
                      staleDays > 14
                      ? "font-semibold text-red-400"
                      : staleDays > 7
                      ? "font-semibold text-yellow-400"
                      : "font-semibold text-emerald-400"
                      }
                      >
                      {staleDays === 0
                      ? (isDe ? "Heute" : "Today")
                      : isDe ? `vor ${staleDays} Tagen` : `${staleDays} days ago`}
                      </span>

                      </div>
                        <div
                          onClick={(event) => {
                            event.stopPropagation()
                          }}
                        >
                         <LeadActions
                            leadId={lead.id}
                            currentStatus={lead.status}
                            phone={lead.phone}
                            email={lead.email}
                            onLeadDeleted={() => {
                              if (leads.length === 1) {
                                setImportIssues([])
                              }

                              void refresh()
                            }}
                            onStatusChanged={(leadId, newStatus) => {
                              setLeads((current) =>
                                current.map((lead) =>
                                  lead.id === leadId
                                    ? {
                                        ...lead,
                                        status: newStatus,
                                      }
                                    : lead
                                )
                              )
                            }}
                          />
                        </div>
                      </div>
                      
                    </div>
                  </div>
                </div>
              )
            })}
                    </div>

  ) : (

    <LeadPipeline leads={filteredLeads}/>

  )

        )}
      </div>
    </AuthGuard>
  )
}