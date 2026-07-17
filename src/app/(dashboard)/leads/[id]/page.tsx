"use client"

import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

import { getStaleDays } from "@/lib/scoring"
import PipelineJourney from "@/components/leads/PipelineJourney"
import DealMetrics from "@/components/leads/DealMetrics"
import ActivityTimeline from "@/components/leads/ActivityTimeline"
import TaskCard from "@/components/leads/TaskCard"
import AILeadSummary from "@/components/leads/AILeadSummary"

import { useLeadDetail } from "@/hooks/useLeadDetail"
import { useLeadActions } from "@/hooks/useLeadActions"
import { useTasks } from "@/hooks/useTasks"
import { EmailComposeModal } from "@/components/leads/EmailComposeModal"
import { useAppPreferences } from "@/components/AppPreferencesProvider"

import { leadDisplayName, leadCompany } from "@/lib/utils"
import { calculateSalesScore } from "@/lib/salesScore"

import type {
  LeadSource,
  LeadStatus,
  TaskPriority,
} from "@/types"


export default function LeadDetailPage() {
  const { language } = useAppPreferences()
  const isDe = language === "de"
  const locale = isDe ? "de-DE" : "en-US"

  const params = useParams()
  const router = useRouter()

  const id =
    typeof params?.id === "string"
      ? params.id
      : ""


  const {
    lead,
    activities,
    loading,
    refresh,
  } = useLeadDetail(id)



  const [saved, setSaved] = useState(false)

  const [name, setName] = useState("")
  const [company, setCompany] = useState("")

  const [status, setStatus] =
    useState<LeadStatus>("new")

  const [value, setValue] =
    useState("")

  const [notes, setNotes] =
    useState("")


  const [source, setSource] =
    useState<LeadSource>("other")


  const [tagsInput, setTagsInput] =
    useState("")


  const [email, setEmail] =
    useState("")

  const [phone, setPhone] =
    useState("")

  const [address, setAddress] =
    useState("")

  const [website, setWebsite] =
    useState("")


  const [newTask, setNewTask] =
    useState("")

  const [newTaskDueDate, setNewTaskDueDate] =
    useState("")


  const [newTaskPriority, setNewTaskPriority] =
    useState<TaskPriority>("medium")


  const [saving, setSaving] =
    useState(false)


  const [formError, setFormError] =
    useState<string | null>(null)

  const [emailModalOpen, setEmailModalOpen] = useState(false)



  useEffect(() => {

    if (!lead) return


    setName(lead.name)
    setCompany(lead.company)

    setStatus(lead.status)

    setValue(
      String(lead.value ?? 0)
    )

    setNotes(
      lead.notes ?? ""
    )


    setSource(
      lead.source ?? "other"
    )


    setTagsInput(
      (lead.tags || []).join(", ")
    )


    setEmail(
      lead.email ?? ""
    )


    setPhone(
      lead.phone ?? ""
    )


    setAddress(
      lead.address ?? ""
    )


    setWebsite(
      lead.website ?? ""
    )


  }, [lead])



  const {
    saveLead,
    deleteLead,
  } = useLeadActions(refresh)



  const {
    tasks,
    addTask,
    toggleTask,
    deleteTask,
  } = useTasks(id)



  const getDealAge = () => {

    if (!lead)
      return 0


    const created =
      new Date(
        lead.created_at
      ).getTime()


    return Math.floor(
      (
        Date.now() - created
      ) /
      (
        1000 *
        60 *
        60 *
        24
      )
    )

  }



  const getStageAge = () => {

    if (!lead?.stage_changed_at)
      return 0


    const changed =
      new Date(
        lead.stage_changed_at
      ).getTime()


    return Math.floor(
      (
        Date.now() - changed
      ) /
      (
        1000 *
        60 *
        60 *
        24
      )
    )

  }



  const handleSave = async () => {

    if (!lead)
      return


    setFormError(null)


    const updatedValue =
      Number(value)


    const tags =
      tagsInput
        .split(",")
        .map((tag) =>
          tag.trim()
        )
        .filter(Boolean)



    if (!name.trim()) {

      setFormError(
        isDe ? "Lead-Name ist erforderlich" : "Lead name is required"
      )

      return
    }


    if (!company.trim()) {

      setFormError(
        isDe ? "Firmenname ist erforderlich" : "Company name is required"
      )

      return
    }


    if (
      isNaN(updatedValue) ||
      updatedValue < 0
    ) {

      setFormError(
        isDe ? "Deal-Wert muss eine gültige Zahl sein" : "Deal value must be a valid number"
      )

      return
    }



    setSaving(true)


    try {

      await saveLead(
        lead.id,
        lead.status,
        {
          name,
          company,
          status,
          value: updatedValue,
          notes,
          source,
          tags,
          email,
          phone,
          address,
          website,
        }
      )


      setSaved(true)

      toast.success(
        isDe ? "Lead aktualisiert" : "Lead updated"
      )


      window.setTimeout(
        () => setSaved(false),
        2200
      )


    } catch(error) {

      console.error(error)


      setFormError(
        error instanceof Error
          ? error.message
          : (isDe ? "Lead konnte nicht gespeichert werden" : "Could not save lead")
      )


      toast.error(
        isDe ? "Lead konnte nicht gespeichert werden" : "Could not save lead"
      )


    } finally {

      setSaving(false)

    }

  }

  const handleDelete = async () => {
    if (!lead) return

    const ok = window.confirm(
      isDe
        ? "Diesen Lead löschen? Diese Aktion kann nicht rückgängig gemacht werden."
        : "Delete this lead? This action cannot be undone."
    )

    if (!ok) return

    try {
      await deleteLead(lead.id)
      toast.success(isDe ? "Lead gelöscht" : "Lead deleted")
      router.push("/leads")
    } catch (error) {
      console.error(error)
      toast.error(isDe ? "Lead konnte nicht gelöscht werden" : "Could not delete lead")
    }
  }

  if (loading) {
    return (
      <div
        className="
        mx-auto
        w-full
        max-w-[1200px]
        rounded-3xl
        border
        border-border-subtle
        bg-surface-1
        p-8
        "
        aria-busy="true"
      >
        <div className="h-7 w-56 animate-pulse rounded-full bg-foreground/10" />
        <div className="mt-4 h-4 w-44 animate-pulse rounded-full bg-foreground/10" />
        <div className="mt-8 h-32 rounded-2xl bg-foreground/10" />
      </div>
    )
  }

  if (!lead) {
    return (
      <div
        className="
        mx-auto
        w-full
        max-w-[900px]
        rounded-3xl
        border
        border-border-subtle
        bg-surface-1
        p-10
        text-center
        "
      >
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">
          {isDe ? "Lead nicht verfügbar" : "Lead unavailable"}
        </p>
        <h1 className="mt-4 text-2xl font-semibold text-foreground">
          {isDe ? "Wir konnten diesen Lead nicht finden." : "We could not find this lead."}
        </h1>
        <p className="mt-3 text-sm leading-7 text-foreground/65">
          {isDe
            ? "Der Eintrag wurde möglicherweise entfernt oder du hast keinen Zugriff darauf."
            : "The record may have been removed or you may not have access to it."}
        </p>
      </div>
    )
  }



  const dealAge =
    getDealAge()


  const stageAge =
    getStageAge()



  const salesScore =
    calculateSalesScore(
      lead,
      getStaleDays(lead)
    )



  const closeProbability =
    Math.min(
      95,
      Math.max(
        15,
        Math.round(
          (
            salesScore.health +
            salesScore.priority
          ) / 2
        )
      )
    )


  const hasPhone =
    Boolean(lead.phone?.trim())


  const hasEmail =
    Boolean(lead.email?.trim())

  const statusLabel: Record<string, string> = {
    new: isDe ? "Neu" : "New",
    contacted: isDe ? "Kontaktiert" : "Contacted",
    qualified: isDe ? "Qualifiziert" : "Qualified",
    proposal: isDe ? "Angebot" : "Proposal",
    won: isDe ? "Gewonnen" : "Won",
    lost: isDe ? "Verloren" : "Lost",
  }



  return (

    <div
      className="
      mx-auto
      w-full
      max-w-[1200px]
      space-y-6
      "
    >


      {
        saved && (

          <div
            className="
            fixed
            right-6
            top-6
            z-50
            rounded-2xl
            border
            border-emerald-500/20
            bg-emerald-500/15
            px-4
            py-3
            text-sm
            font-medium
            text-emerald-300
            shadow-lg
            "
          >

            {isDe ? "Änderungen erfolgreich gespeichert" : "Changes saved successfully"}

          </div>

        )
      }



      <div
        className="
        flex
        flex-col
        gap-4
        rounded-2xl
        border
        border-border-subtle
        bg-surface-1
        p-6
        xl:flex-row
        xl:items-start
        xl:justify-between
        "
      >


        <div>

          <h1
            className="
            text-3xl
            font-bold
            text-foreground
            "
          >
            {leadDisplayName(lead)}
          </h1>


          <p className="
            mt-1
            text-foreground/65
          ">
            {leadCompany(lead)}
          </p>


          <p className="
            mt-2
            text-sm
            text-foreground/65
          ">
            {isDe ? "Deal-Wert:" : "Deal value:"}
            {" "}
            EUR
            {" "}
            {(lead.value || 0)
              .toLocaleString(locale)}
            {" "}
            |
            {" "}
            {isDe ? "KI-Score" : "AI Score"}
            {" "}
            {salesScore.priority}
          </p>


        </div>



        <div
          className="
          flex
          flex-wrap
          items-center
          gap-3
          "
        >


          <a
            href="#lead-details"
            className="
            rounded-xl
            border
            border-border-subtle
            px-4
            py-2
            text-sm
            font-semibold
            text-foreground/85
            transition
            hover:bg-foreground/5
            "
          >
            {isDe ? "Bearbeiten" : "Edit"}
          </a>



          {hasPhone ? (
            <a
              href={`tel:${lead.phone}`}
              className="
              rounded-xl
              border
              border-border-subtle
              px-4
              py-2
              text-sm
              font-semibold
              text-foreground/85
              transition
              hover:bg-foreground/5
              "
            >
              {isDe ? "Anrufen" : "Call"}
            </a>
          ) : (
            <button
              type="button"
              disabled
              title={isDe ? "Keine Telefonnummer verfügbar" : "No phone number available"}
              className="
              rounded-xl
              border
              border-border-subtle
              px-4
              py-2
              text-sm
              font-semibold
              text-foreground/40
              opacity-60
              "
            >
              {isDe ? "Anrufen" : "Call"}
            </button>
          )}



          {hasEmail ? (
            <button
              type="button"
              onClick={() => setEmailModalOpen(true)}
              className="
              rounded-xl
              border
              border-border-subtle
              px-4
              py-2
              text-sm
              font-semibold
              text-foreground/85
              transition
              hover:bg-foreground/5
              "
            >
              {isDe ? "E-Mail" : "Email"}
            </button>
          ) : (
            <button
              type="button"
              disabled
              title={isDe ? "Keine E-Mail-Adresse verfügbar" : "No email address available"}
              className="
              rounded-xl
              border
              border-border-subtle
              px-4
              py-2
              text-sm
              font-semibold
              text-foreground/40
              opacity-60
              "
            >
              {isDe ? "E-Mail" : "Email"}
            </button>
          )}

          {emailModalOpen ? (
            <EmailComposeModal
              leadId={lead.id}
              defaultTo={lead.email ?? ""}
              onClose={() => setEmailModalOpen(false)}
              onSent={() => void refresh()}
            />
          ) : null}



          <button
            onClick={() => void handleDelete()}
            className="
            rounded-xl
            border
            border-rose-500/30
            bg-rose-500/10
            px-4
            py-2
            text-sm
            font-semibold
            text-rose-300
            transition
            hover:bg-rose-500/20
            "
          >
            {isDe ? "Löschen" : "Delete"}
          </button>



          <div className="flex gap-3">

            <Link
              href={`/ai?leadId=${lead.id}`}
              className="
              rounded-full
              border
              border-cyan-500/30
              bg-cyan-500/10
              px-4
              py-2
              text-sm
              font-semibold
              text-cyan-300
              "
            >
              {isDe ? "KI-Assistent öffnen" : "Open AI Assistant"}
            </Link>


            <Link
              href={`/ai?leadId=${lead.id}`}
              className="
              rounded-full
              border
              border-purple-500/30
              bg-purple-500/10
              px-4
              py-2
              text-sm
              font-semibold
              text-purple-300
              "
            >
              {isDe ? "Analyse generieren" : "Generate Analysis"}
            </Link>

            </div>



          <span
            className={`
              rounded-full
              px-4
              py-2
              text-sm
              font-medium

              ${
                lead.status === "new"
                ? "bg-blue-500/20 text-blue-300"
                : lead.status === "contacted"
                ? "bg-yellow-500/20 text-yellow-300"
                : lead.status === "proposal"
                ? "bg-orange-500/20 text-orange-300"
                : "bg-green-500/20 text-green-300"
              }
            `}
          >

            {(statusLabel[lead.status] || lead.status).toUpperCase()}

          </span>


        </div>


      </div>



      <PipelineJourney status={lead.status} />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <section className="rounded-xl border border-border-subtle bg-surface-1 p-5">
            <h2 className="text-lg font-semibold text-foreground">{isDe ? "Unternehmensinformationen" : "Company Information"}</h2>
            <div className="mt-3 space-y-2 text-sm text-foreground/80">
              <p>{isDe ? "Firma" : "Company"}: {lead.company || (isDe ? "k. A." : "n/a")}</p>
              <p>{isDe ? "Branche" : "Industry"}: {isDe ? "k. A." : "n/a"}</p>
              <p>{isDe ? "Website" : "Website"}: {lead.website || (isDe ? "k. A." : "n/a")}</p>
              <p>{isDe ? "Mitarbeitende" : "Employees"}: {isDe ? "k. A." : "n/a"}</p>
            </div>
          </section>

          <section className="rounded-xl border border-border-subtle bg-surface-1 p-5">
            <h2 className="text-lg font-semibold text-foreground">{isDe ? "Kontakt" : "Contact"}</h2>
            <div className="mt-3 space-y-2 text-sm text-foreground/80">
              <p>{isDe ? "Name" : "Name"}: {lead.name || (isDe ? "k. A." : "n/a")}</p>
              <p>{isDe ? "E-Mail" : "Email"}: {lead.email || (isDe ? "k. A." : "n/a")}</p>
              <p>{isDe ? "Telefon" : "Phone"}: {lead.phone || (isDe ? "k. A." : "n/a")}</p>
            </div>
          </section>

          <section className="rounded-xl border border-border-subtle bg-surface-1 p-5">
            <h2 className="text-lg font-semibold text-foreground">{isDe ? "Deal-Informationen" : "Deal Information"}</h2>
            <div className="mt-3 space-y-2 text-sm text-foreground/80">
              <p>{isDe ? "Wert" : "Value"}: EUR {(lead.value || 0).toLocaleString(locale)}</p>
              <p>{isDe ? "Phase" : "Stage"}: {statusLabel[lead.status] || lead.status}</p>
              <p>{isDe ? "Wahrscheinlichkeit" : "Probability"}: {closeProbability}%</p>
              <p>{isDe ? "KI-Gesundheitsscore" : "AI Health Score"}: {salesScore.health}/100</p>
              <p>{isDe ? "Priorität" : "Priority"}: {salesScore.priority}</p>
              <p>{isDe ? "Erwarteter Abschluss" : "Expected close"}: {Math.max(3, 30 - stageAge)} {isDe ? "Tage" : "days"}</p>
            </div>
          </section>

          <section className="rounded-xl border border-border-subtle bg-surface-1 p-5">
            <h2 className="text-lg font-semibold text-foreground">{isDe ? "Notizen" : "Notes"}</h2>
            <p className="mt-3 text-sm text-foreground/80">{lead.notes || (isDe ? "Noch keine Notizen." : "No notes yet.")}</p>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent p-6">
            <p className="text-sm uppercase tracking-widest text-cyan-400">{isDe ? "KI-Assistent" : "AI Assistant"}</p>
            <h2 className="mt-2 text-2xl font-bold text-foreground">{isDe ? "KI-Analyse ist zentralisiert" : "AI analysis is centralized"}</h2>
            <p className="mt-3 text-sm text-foreground/80">
              {isDe
                ? "Nutze den KI-Assistenten für Strategie, Coaching, E-Mail-Generierung und Risiko-Erkennung, damit jede Analyse an einem Ort bleibt."
                : "Use AI Assistant for strategy, coaching, email generation, and risk detection so every analysis stays in one place."}
            </p>
            <div className="mt-4">
              <Link
                href={`/ai?leadId=${lead.id}`}
                className="inline-flex rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/20"
              >
                {isDe ? "KI-Assistent für diesen Lead öffnen" : "Open AI Assistant for this lead"}
              </Link>
            </div>
          </section>
        </div>
      </div>

      <DealMetrics
        dealAge={dealAge}
        priorityScore={salesScore.priority}
        healthScore={salesScore.health}
        value={lead.value}
        stageAge={stageAge}
      />

      <AILeadSummary lead={lead} />

      <div className="space-y-5 rounded-xl border border-border-subtle bg-surface-1 p-6">
        <h2 className="text-xl font-semibold text-foreground">{isDe ? "Aufgaben" : "Tasks"}</h2>

        <div className="flex flex-col gap-3 md:flex-row">
          <input
            value={newTask}
            onChange={(event) => setNewTask(event.target.value)}
            placeholder={isDe ? "Neue Aufgabe hinzufügen..." : "Add new task..."}
            className="flex-1 rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground"
          />

          <input
            value={newTaskDueDate}
            onChange={(event) => setNewTaskDueDate(event.target.value)}
            type="date"
            className="rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground"
          />

          <select
            value={newTaskPriority}
            onChange={(event) => setNewTaskPriority(event.target.value as TaskPriority)}
            className="rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground"
          >
            <option value="low">{isDe ? "niedrig" : "low"}</option>
            <option value="medium">{isDe ? "mittel" : "medium"}</option>
            <option value="high">{isDe ? "hoch" : "high"}</option>
          </select>

          <button
            onClick={async () => {
              if (!newTask.trim()) return
              try {
                await addTask(newTask, newTaskDueDate || undefined, newTaskPriority)
                setNewTask("")
                setNewTaskDueDate("")
                setNewTaskPriority("medium")
                await refresh()
              } catch (error) {
                console.error(error)
                toast.error(isDe ? "Aufgabe konnte nicht hinzugefügt werden" : "Could not add task")
              }
            }}
            className="rounded-xl bg-foreground px-5 py-3 font-semibold text-background"
          >
            {isDe ? "Hinzufügen" : "Add"}
          </button>
        </div>

        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              title={task.title}
              completed={task.completed}
              dueDate={task.due_date}
              priority={task.priority}
              onToggle={async () => {
                await toggleTask(task.id, task.completed)
                await refresh()
              }}
              onDelete={async () => {
                await deleteTask(task.id)
                await refresh()
              }}
            />
          ))}

          {tasks.length === 0 && <p className="text-sm text-foreground/55">{isDe ? "Noch keine Aufgaben." : "No tasks yet."}</p>}
        </div>
      </div>

      <div id="lead-details" className="space-y-4 rounded-xl border border-border-subtle bg-surface-1 p-6">
        <h2 className="text-xl font-semibold text-foreground">{isDe ? "Lead-Details" : "Lead Details"}</h2>

        <div className="rounded-xl border border-border-subtle bg-surface-2/70 p-3 text-sm text-foreground/80">
          <p>{isDe ? "Erstellt" : "Created"}: {new Date(lead.created_at).toLocaleString(locale)}</p>
          <p>{isDe ? "Letzte Aktualisierung" : "Last update"}: {lead.updated_at ? new Date(lead.updated_at).toLocaleString(locale) : (isDe ? "Nicht verfügbar" : "Not available")}</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm text-foreground/65">{isDe ? "Kontaktname" : "Contact Name"}</label>
            <input value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none transition focus:border-cyan-400/50" />
          </div>

          <div>
            <label className="mb-2 block text-sm text-foreground/65">{isDe ? "Firma" : "Company"}</label>
            <input value={company} onChange={(event) => setCompany(event.target.value)} className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none transition focus:border-cyan-400/50" />
          </div>

          <div>
            <label className="mb-2 block text-sm text-foreground/65">{isDe ? "Deal-Wert" : "Deal Value"}</label>
            <input value={value} onChange={(event) => setValue(event.target.value)} type="number" className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none transition focus:border-cyan-400/50" />
          </div>

          <div>
            <label className="mb-2 block text-sm text-foreground/65">{isDe ? "Phase" : "Stage"}</label>
            <select value={status} onChange={(event) => setStatus(event.target.value as LeadStatus)} className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none transition focus:border-cyan-400/50">
              <option value="new">{isDe ? "Neu" : "New"}</option>
              <option value="contacted">{isDe ? "Kontaktiert" : "Contacted"}</option>
              <option value="qualified">{isDe ? "Qualifiziert" : "Qualified"}</option>
              <option value="proposal">{isDe ? "Angebot" : "Proposal"}</option>
              <option value="won">{isDe ? "Gewonnen" : "Won"}</option>
              <option value="lost">{isDe ? "Verloren" : "Lost"}</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-foreground/65">{isDe ? "Quelle" : "Source"}</label>
            <select value={source} onChange={(event) => setSource(event.target.value as LeadSource)} className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none transition focus:border-cyan-400/50">
              <option value="website">{isDe ? "Website" : "Website"}</option>
              <option value="recommendation">{isDe ? "Empfehlung" : "Recommendation"}</option>
              <option value="phone">{isDe ? "Telefon" : "Phone"}</option>
              <option value="advertising">{isDe ? "Werbung" : "Advertising"}</option>
              <option value="other">{isDe ? "Sonstiges" : "Other"}</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-foreground/65">{isDe ? "E-Mail" : "Email"}</label>
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none transition focus:border-cyan-400/50" />
          </div>

          <div>
            <label className="mb-2 block text-sm text-foreground/65">{isDe ? "Telefon" : "Phone"}</label>
            <input value={phone} onChange={(event) => setPhone(event.target.value)} className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none transition focus:border-cyan-400/50" />
          </div>

          <div>
            <label className="mb-2 block text-sm text-foreground/65">{isDe ? "Website" : "Website"}</label>
            <input value={website} onChange={(event) => setWebsite(event.target.value)} className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none transition focus:border-cyan-400/50" />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm text-foreground/65">{isDe ? "Adresse" : "Address"}</label>
            <input value={address} onChange={(event) => setAddress(event.target.value)} className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none transition focus:border-cyan-400/50" />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm text-foreground/65">{isDe ? "Tags" : "Tags"}</label>
            <input value={tagsInput} onChange={(event) => setTagsInput(event.target.value)} placeholder={isDe ? "Kommagetrennt" : "Comma separated"} className="w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none transition focus:border-cyan-400/50" />
          </div>
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-sm text-foreground/65">{isDe ? "Notizen" : "Notes"}</label>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="h-40 w-full rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none transition focus:border-cyan-400/50" />
        </div>

        {formError && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {formError}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-foreground px-6 py-3 font-semibold text-background transition hover:scale-[1.02] disabled:opacity-60"
          >
            {saving ? (isDe ? "Speichere..." : "Saving...") : (isDe ? "Änderungen speichern" : "Save Changes")}
          </button>
        </div>
      </div>





      <ActivityTimeline
        activities={activities}
      />


    </div>

  )

}
