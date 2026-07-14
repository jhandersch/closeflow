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

import { useLeadDetail } from "@/hooks/useLeadDetail"
import { useLeadActions } from "@/hooks/useLeadActions"
import { useTasks } from "@/hooks/useTasks"

import { leadDisplayName, leadCompany } from "@/lib/utils"
import { calculateSalesScore } from "@/lib/salesScore"

import type {
  LeadSource,
  LeadStatus,
  TaskPriority,
} from "@/types"


export default function LeadDetailPage() {

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
        "Lead name is required"
      )

      return
    }


    if (!company.trim()) {

      setFormError(
        "Company name is required"
      )

      return
    }


    if (
      isNaN(updatedValue) ||
      updatedValue < 0
    ) {

      setFormError(
        "Deal value must be a valid number"
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
        "Lead updated"
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
          : "Could not save lead"
      )


      toast.error(
        "Could not save lead"
      )


    } finally {

      setSaving(false)

    }

  }
    const handleDelete = async () => {

    if (!lead)
      return


    const ok =
      window.confirm(
        "Delete this lead? This action cannot be undone."
      )


    if (!ok)
      return


    try {

      await deleteLead(
        lead.id
      )


      toast.success(
        "Lead deleted"
      )


      router.push(
        "/leads"
      )


    } catch(error) {

      console.error(error)


      toast.error(
        "Could not delete lead"
      )

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

        <div className="
          h-7
          w-56
          animate-pulse
          rounded-full
          bg-foreground/10
        "/>


        <div className="
          mt-4
          h-4
          w-44
          animate-pulse
          rounded-full
          bg-foreground/10
        "/>


        <div className="
          mt-8
          h-32
          rounded-2xl
          bg-foreground/10
        "/>


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

        <p className="
          text-sm
          uppercase
          tracking-[0.3em]
          text-cyan-400
        ">
          Lead unavailable
        </p>


        <h1 className="
          mt-4
          text-2xl
          font-semibold
          text-foreground
        ">
          We could not find this lead.
        </h1>


        <p className="
          mt-3
          text-sm
          leading-7
          text-foreground/65
        ">
          The record may have been removed or you may not have access to it.
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

            Changes saved successfully

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
            Deal value:
            {" "}
            EUR
            {" "}
            {(lead.value || 0)
              .toLocaleString("de-DE")}
            {" "}
            |
            {" "}
            AI Score
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
            Edit
          </a>



          <a
            href={
              lead.phone
                ? `tel:${lead.phone}`
                : undefined
            }
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
            Call
          </a>



          <a
            href={
              lead.email
                ? `mailto:${lead.email}`
                : undefined
            }
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
            Email
          </a>



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
            Delete
          </button>



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
            transition
            hover:bg-cyan-500/20
            "
          >
            Open in AI Assistant
          </Link>



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

            {lead.status.toUpperCase()}

          </span>


        </div>


      </div>



      <PipelineJourney
        status={lead.status}
      />
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">

        <div className="space-y-4">


          <section className="
            rounded-xl
            border
            border-border-subtle
            bg-surface-1
            p-5
          ">

            <h2 className="text-lg font-semibold text-foreground">
              Company Information
            </h2>

            <div className="mt-3 space-y-2 text-sm text-foreground/80">

              <p>
                Company: {lead.company || "n/a"}
              </p>

              <p>
                Industry: n/a
              </p>

              <p>
                Website: {lead.website || "n/a"}
              </p>

              <p>
                Employees: n/a
              </p>

            </div>

          </section>



          <section className="
            rounded-xl
            border
            border-border-subtle
            bg-surface-1
            p-5
          ">

            <h2 className="text-lg font-semibold text-foreground">
              Contact
            </h2>


            <div className="mt-3 space-y-2 text-sm text-foreground/80">

              <p>
                Name: {lead.name || "n/a"}
              </p>

              <p>
                Email: {lead.email || "n/a"}
              </p>

              <p>
                Phone: {lead.phone || "n/a"}
              </p>

            </div>

          </section>



          <section className="
            rounded-xl
            border
            border-border-subtle
            bg-surface-1
            p-5
          ">

            <h2 className="text-lg font-semibold text-foreground">
              Deal Information
            </h2>


            <div className="mt-3 space-y-2 text-sm text-foreground/80">

              <p>
                Value:
                {" "}
                EUR {(lead.value || 0).toLocaleString("de-DE")}
              </p>

              <p>
                Stage:
                {" "}
                {lead.status}
              </p>

              <p>
                Probability:
                {" "}
                {closeProbability}%
              </p>

              <p>
                Expected close:
                {" "}
                {Math.max(3,30-stageAge)}
                {" "}
                days
              </p>

            </div>

          </section>



          <section className="
            rounded-xl
            border
            border-border-subtle
            bg-surface-1
            p-5
          ">

            <h2 className="text-lg font-semibold text-foreground">
              Notes
            </h2>


            <p className="
              mt-3
              text-sm
              text-foreground/80
            ">
              {lead.notes || "No notes yet."}
            </p>

          </section>


        </div>





        <div className="space-y-4">


          <section className="
            rounded-xl
            border
            border-cyan-500/20
            bg-gradient-to-br
            from-cyan-500/10
            via-blue-500/5
            to-transparent
            p-6
          ">


            <p className="
              text-sm
              uppercase
              tracking-widest
              text-cyan-400
            ">
              AI Assistant
            </p>


            <h2 className="
              mt-2
              text-2xl
              font-bold
              text-foreground
            ">
              AI analysis is centralized
            </h2>


            <p className="
              mt-3
              text-sm
              text-foreground/80
            ">
              Use AI Assistant for strategy,
              coaching, email generation,
              and risk detection so every
              analysis stays in one place.
            </p>


            <div className="mt-4">

              <Link
                href={`/ai?leadId=${lead.id}`}
                className="
                inline-flex
                rounded-full
                border
                border-cyan-500/30
                bg-cyan-500/10
                px-4
                py-2
                text-sm
                font-semibold
                text-cyan-300
                transition
                hover:bg-cyan-500/20
                "
              >

                Open AI Assistant for this lead

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





      <div className="
        space-y-5
        rounded-xl
        border
        border-border-subtle
        bg-surface-1
        p-6
      ">


        <h2 className="
          text-xl
          font-semibold
          text-foreground
        ">
          Tasks
        </h2>



        <div className="
          flex
          flex-col
          gap-3
          md:flex-row
        ">


          <input

            value={newTask}

            onChange={(event)=>
              setNewTask(event.target.value)
            }

            placeholder="Add new task..."

            className="
            flex-1
            rounded-xl
            border
            border-border-subtle
            bg-surface-2
            px-4
            py-3
            text-foreground
            "

          />



          <input

            value={newTaskDueDate}

            onChange={(event)=>
              setNewTaskDueDate(event.target.value)
            }

            type="date"

            className="
            rounded-xl
            border
            border-border-subtle
            bg-surface-2
            px-4
            py-3
            text-foreground
            "

          />



          <select

            value={newTaskPriority}

            onChange={(event)=>
              setNewTaskPriority(
                event.target.value as TaskPriority
              )
            }

            className="
            rounded-xl
            border
            border-border-subtle
            bg-surface-2
            px-4
            py-3
            text-foreground
            "

          >

            <option value="low">
              low
            </option>

            <option value="medium">
              medium
            </option>

            <option value="high">
              high
            </option>

          </select>



          <button

            onClick={async()=>{

              if(!newTask.trim())
                return

              await addTask(
                newTask,
                newTaskDueDate || undefined,
                newTaskPriority
              )


              setNewTask("")
              setNewTaskDueDate("")
              setNewTaskPriority("medium")

            }}

            className="
            rounded-xl
            bg-foreground
            px-5
            py-3
            font-semibold
            text-background
            "

          >

            Add

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

              onToggle={() =>
                toggleTask(
                  task.id,
                  task.completed
                )
              }

              onDelete={() =>
                deleteTask(task.id)
              }

            />

          ))}


          {tasks.length === 0 && (

            <p className="
              text-sm
              text-foreground/55
            ">
              No tasks yet.
            </p>

          )}

        </div>


      </div>





      <div
        id="lead-details"
        className="
        space-y-4
        rounded-xl
        border
        border-border-subtle
        bg-surface-1
        p-6
        "
      >


        <h2 className="
          text-xl
          font-semibold
          text-foreground
        ">
          Lead Details
        </h2>



        <div className="
          rounded-xl
          border
          border-border-subtle
          bg-surface-2/70
          p-3
          text-sm
          text-foreground/80
        ">


          <p>
            Created:
            {" "}
            {new Date(
              lead.created_at
            ).toLocaleString("de-DE")}
          </p>


          <p>
            Last update:
            {" "}
            {
              lead.updated_at
                ? new Date(
                    lead.updated_at
                  ).toLocaleString("de-DE")
                : "Not available"
            }
          </p>


        </div>





        <div className="
          grid
          gap-5
          md:grid-cols-2
        ">


          <div>

            <label className="
              mb-2
              block
              text-sm
              text-foreground/65
            ">
              Contact Name
            </label>


            <input

              value={name}

              onChange={(event)=>
                setName(
                  event.target.value
                )
              }

              className="
              w-full
              rounded-2xl
              border
              border-border-subtle
              bg-surface-2
              px-4
              py-3
              text-foreground
              outline-none
              transition
              focus:border-cyan-400/50
              "

            />

          </div>





          <div>

            <label className="
              mb-2
              block
              text-sm
              text-foreground/65
            ">
              Company
            </label>


            <input

              value={company}

              onChange={(event)=>
                setCompany(
                  event.target.value
                )
              }

              className="
              w-full
              rounded-2xl
              border
              border-border-subtle
              bg-surface-2
              px-4
              py-3
              text-foreground
              outline-none
              transition
              focus:border-cyan-400/50
              "

            />

          </div>





          <div>

            <label className="
              mb-2
              block
              text-sm
              text-foreground/65
            ">
              Deal Value
            </label>


            <input

              value={value}

              onChange={(event)=>
                setValue(
                  event.target.value
                )
              }

              type="number"

              className="
              w-full
              rounded-2xl
              border
              border-border-subtle
              bg-surface-2
              px-4
              py-3
              text-foreground
              outline-none
              transition
              focus:border-cyan-400/50
              "

            />

          </div>





          <div>

            <label className="
              mb-2
              block
              text-sm
              text-foreground/65
            ">
              Stage
            </label>


            <select

              value={status}

              onChange={(event)=>
                setStatus(
                  event.target.value as LeadStatus
                )
              }

              className="
              w-full
              rounded-2xl
              border
              border-border-subtle
              bg-surface-2
              px-4
              py-3
              text-foreground
              outline-none
              transition
              focus:border-cyan-400/50
              "

            >

              <option value="new">
                New
              </option>

              <option value="contacted">
                Contacted
              </option>

              <option value="qualified">
                Qualified
              </option>

              <option value="proposal">
                Proposal
              </option>

              <option value="won">
                Won
              </option>

              <option value="lost">
                Lost
              </option>


            </select>


          </div>
                    <div>

            <label className="
              mb-2
              block
              text-sm
              text-foreground/65
            ">
              Source
            </label>


            <select

              value={source}

              onChange={(event)=>
                setSource(
                  event.target.value as LeadSource
                )
              }

              className="
              w-full
              rounded-2xl
              border
              border-border-subtle
              bg-surface-2
              px-4
              py-3
              text-foreground
              outline-none
              transition
              focus:border-cyan-400/50
              "

            >

              <option value="website">
                Website
              </option>

              <option value="recommendation">
                Recommendation
              </option>

              <option value="phone">
                Phone
              </option>

              <option value="advertising">
                Advertising
              </option>

              <option value="other">
                Other
              </option>

            </select>

          </div>





          <div>

            <label className="
              mb-2
              block
              text-sm
              text-foreground/65
            ">
              Email
            </label>


            <input

              value={email}

              onChange={(event)=>
                setEmail(
                  event.target.value
                )
              }

              type="email"

              className="
              w-full
              rounded-2xl
              border
              border-border-subtle
              bg-surface-2
              px-4
              py-3
              text-foreground
              outline-none
              transition
              focus:border-cyan-400/50
              "

            />

          </div>





          <div>

            <label className="
              mb-2
              block
              text-sm
              text-foreground/65
            ">
              Phone
            </label>


            <input

              value={phone}

              onChange={(event)=>
                setPhone(
                  event.target.value
                )
              }

              className="
              w-full
              rounded-2xl
              border
              border-border-subtle
              bg-surface-2
              px-4
              py-3
              text-foreground
              outline-none
              transition
              focus:border-cyan-400/50
              "

            />

          </div>





          <div>

            <label className="
              mb-2
              block
              text-sm
              text-foreground/65
            ">
              Website
            </label>


            <input

              value={website}

              onChange={(event)=>
                setWebsite(
                  event.target.value
                )
              }

              className="
              w-full
              rounded-2xl
              border
              border-border-subtle
              bg-surface-2
              px-4
              py-3
              text-foreground
              outline-none
              transition
              focus:border-cyan-400/50
              "

            />

          </div>





          <div className="md:col-span-2">

            <label className="
              mb-2
              block
              text-sm
              text-foreground/65
            ">
              Address
            </label>


            <input

              value={address}

              onChange={(event)=>
                setAddress(
                  event.target.value
                )
              }

              className="
              w-full
              rounded-2xl
              border
              border-border-subtle
              bg-surface-2
              px-4
              py-3
              text-foreground
              outline-none
              transition
              focus:border-cyan-400/50
              "

            />

          </div>





          <div className="md:col-span-2">

            <label className="
              mb-2
              block
              text-sm
              text-foreground/65
            ">
              Tags
            </label>


            <input

              value={tagsInput}

              onChange={(event)=>
                setTagsInput(
                  event.target.value
                )
              }

              placeholder="Comma separated"

              className="
              w-full
              rounded-2xl
              border
              border-border-subtle
              bg-surface-2
              px-4
              py-3
              text-foreground
              outline-none
              transition
              focus:border-cyan-400/50
              "

            />

          </div>


        </div>





        <div className="mt-6">


          <label className="
            mb-2
            block
            text-sm
            text-foreground/65
          ">
            Notes
          </label>


          <textarea

            value={notes}

            onChange={(event)=>
              setNotes(
                event.target.value
              )
            }

            className="
            h-40
            w-full
            rounded-2xl
            border
            border-border-subtle
            bg-surface-2
            px-4
            py-3
            text-foreground
            outline-none
            transition
            focus:border-cyan-400/50
            "

          />


        </div>





        {
          formError && (

            <div className="
              rounded-2xl
              border
              border-rose-500/20
              bg-rose-500/10
              px-4
              py-3
              text-sm
              text-rose-200
            ">

              {formError}

            </div>

          )
        }





        <div className="
          mt-6
          flex
          flex-col
          gap-3
          sm:flex-row
        ">


          <button

            onClick={handleSave}

            disabled={saving}

            className="
            rounded-xl
            bg-foreground
            px-6
            py-3
            font-semibold
            text-background
            transition
            hover:scale-[1.02]
            disabled:opacity-60
            "

          >

            {
              saving
              ? "Saving..."
              : "Save Changes"
            }


          </button>


        </div>


      </div>





      <ActivityTimeline
        activities={activities}
      />


    </div>

  )

}
