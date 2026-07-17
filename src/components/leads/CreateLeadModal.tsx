"use client"

import { useState } from "react"
import toast from "react-hot-toast"

import type { LeadSource, LeadStatus } from "@/types"


type CreateLeadModalProps = {
  open: boolean
  onClose: () => void
  onCreated: () => void
}



export default function CreateLeadModal({
  open,
  onClose,
  onCreated,
}: CreateLeadModalProps) {


  const [name, setName] = useState("")
  const [company, setCompany] = useState("")

  const [value, setValue] = useState("")

  const [status, setStatus] =
    useState<LeadStatus>("new")


  const [source, setSource] =
    useState<LeadSource>("other")


  const [email, setEmail] =
    useState("")

  const [phone, setPhone] =
    useState("")

  const [website, setWebsite] =
    useState("")

  const [address, setAddress] =
    useState("")


  const [tagsInput, setTagsInput] =
    useState("")


  const [notes, setNotes] =
    useState("")


  const [nextAction, setNextAction] =
    useState("")


  const [nextActionDate, setNextActionDate] =
    useState("")


  const [loading, setLoading] =
    useState(false)


  const [error, setError] =
    useState<string | null>(null)

  const isDe = true

    const resetForm = () => {
  setName("")
  setCompany("")
  setValue("")
  setStatus("new")
  setSource("other")
  setEmail("")
  setPhone("")
  setWebsite("")
  setAddress("")
  setTagsInput("")
  setNotes("")
  setNextAction("")
  setNextActionDate("")
  setError(null)
}
  
  const handleSubmit = async (
  event: React.FormEvent
) => {

  event.preventDefault()

  setError(null)

  if (!name.trim() || !company.trim()) {
    setError(isDe ? "Name und Firma sind erforderlich" : "Name and company are required")
    return
  }


  try {

    setLoading(true)


    const response = await fetch("/api/leads", {
      method: "POST",
      headers:{
        "Content-Type":"application/json"
      },
      body: JSON.stringify({

        name,
        company,
        value:Number(value) || 0,
        status,
        source,
        email,
        phone,
        website,
        address,
        tags:
          tagsInput
            .split(",")
            .map(tag => tag.trim())
            .filter(Boolean),
        notes,
        next_action: nextAction,
        next_action_date: nextActionDate

      })
    })


    if(!response.ok){
      throw new Error(isDe ? "Lead konnte nicht erstellt werden" : "Could not create lead")
    }


    toast.success(isDe ? "Lead erstellt" : "Lead created")

    resetForm()

    onCreated()

    onClose()


  } catch(error){

    console.error(error)

    setError(
      error instanceof Error
        ? error.message
        : (isDe ? "Etwas ist schiefgelaufen" : "Something went wrong")
    )

  } finally {

    setLoading(false)

  }

  }



  if (!open) {
    return null
  }



  return (

    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-black/60
        p-4
      "
    >


      <div
        className="
          w-full
          max-w-3xl
          max-h-[90vh]
          overflow-y-auto
          rounded-3xl
          border
          border-border-subtle
          bg-surface-1
          p-6
          shadow-2xl
        "
      >
        <form onSubmit={handleSubmit}>


        <div
          className="
            flex
            items-center
            justify-between
          "
        >

          <div>

            <p
              className="
                text-sm
                text-foreground/60
              "
            >
              Lead-Management
            </p>


            <h2
              className="
                text-2xl
                font-semibold
                text-foreground
              "
            >
              Neuen Lead erstellen
            </h2>

          </div>



          <button

            onClick={() => {
              resetForm()
              onClose()
            }}

            className="
              rounded-xl
              border
              border-border-subtle
              px-3
              py-2
              text-sm
              text-foreground/70
              transition
              hover:bg-foreground/5
            "
          >

            Schließen

          </button>


        </div>




        <div
          className="
            mt-6
            grid
            gap-5
            md:grid-cols-2
          "
        >



          <div>

            <label
              className="
                mb-2
                block
                text-sm
                text-foreground/65
              "
            >
              Kontaktname *
            </label>


            <input

              value={name}

              onChange={(event)=>
                setName(event.target.value)
              }

              placeholder="John Smith"

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

            <label
              className="
                mb-2
                block
                text-sm
                text-foreground/65
              "
            >
              Firma *
            </label>


            <input

              value={company}

              onChange={(event)=>
                setCompany(event.target.value)
              }

              placeholder="Firmenname"

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

            <label
              className="
                mb-2
                block
                text-sm
                text-foreground/65
              "
            >
              Deal-Wert (€)
            </label>


            <input

              value={value}

              onChange={(event)=>
                setValue(event.target.value)
              }

              type="number"

              placeholder="5000"

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

            <label
              className="
                mb-2
                block
                text-sm
                text-foreground/65
              "
            >
              Pipeline-Stufe
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
                Neu
              </option>

              <option value="contacted">
                Kontaktiert
              </option>

              <option value="qualified">
                Qualifiziert
              </option>

              <option value="proposal">
                Angebot
              </option>

              <option value="won">
                Gewonnen
              </option>

              <option value="lost">
                Verloren
              </option>


            </select>


          </div>
                    <div>

            <label
              className="
                mb-2
                block
                text-sm
                text-foreground/65
              "
            >
              Lead-Quelle
            </label>

            <select
              value={source}
              onChange={(event) =>
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
                Webseite
              </option>

              <option value="recommendation">
                Empfehlung
              </option>

              <option value="phone">
                Telefon
              </option>

              <option value="advertising">
                Werbung
              </option>

              <option value="other">
                Sonstiges
              </option>

            </select>

          </div>



          <div>

            <label
              className="
                mb-2
                block
                text-sm
                text-foreground/65
              "
            >
              E-Mail
            </label>


            <input
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              type="email"
              placeholder="kunde@beispiel.de"
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

            <label
              className="
                mb-2
                block
                text-sm
                text-foreground/65
              "
            >
              Telefon
            </label>


            <input
              value={phone}
              onChange={(event) =>
                setPhone(event.target.value)
              }
              placeholder="+49..."
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

            <label
              className="
                mb-2
                block
                text-sm
                text-foreground/65
              "
            >
              Webseite
            </label>


            <input
              value={website}
              onChange={(event) =>
                setWebsite(event.target.value)
              }
              placeholder="https://firma.de"
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

            <label
              className="
                mb-2
                block
                text-sm
                text-foreground/65
              "
            >
              Adresse
            </label>


            <input
              value={address}
              onChange={(event) =>
                setAddress(event.target.value)
              }
              placeholder="Straße, Stadt"
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

            <label
              className="
                mb-2
                block
                text-sm
                text-foreground/65
              "
            >
              Tags
            </label>


            <input
              value={tagsInput}
              onChange={(event) =>
                setTagsInput(event.target.value)
              }
              placeholder="enterprise, hot-lead"
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

            <label
              className="
                mb-2
                block
                text-sm
                text-foreground/65
              "
            >
              Nächste Aktion
            </label>


            <input
              value={nextAction}
              onChange={(event) =>
                setNextAction(event.target.value)
              }
              placeholder="Kunden anrufen"
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

            <label
              className="
                mb-2
                block
                text-sm
                text-foreground/65
              "
            >
              Datum der nächsten Aktion
            </label>


            <input
              value={nextActionDate}
              onChange={(event) =>
                setNextActionDate(event.target.value)
              }
              type="date"
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



        <div className="mt-5">

          <label
            className="
              mb-2
              block
              text-sm
              text-foreground/65
            "
          >
            Notizen
          </label>


          <textarea
            value={notes}
            onChange={(event) =>
              setNotes(event.target.value)
            }
            placeholder="Notizen zu dieser Opportunity hinzufügen..."
            className="
              h-32
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
              {error && (

        <div
          className="
            mt-4
            rounded-2xl
            border
            border-rose-500/20
            bg-rose-500/10
            px-4
            py-3
            text-sm
            text-rose-200
          "
        >
          {error}
        </div>

      )}



      <div
        className="
          mt-6
          flex
          justify-end
          gap-3
        "
      >

        <button
          type="button"
          onClick={() => {
            resetForm()
            onClose()
          }}
          disabled={loading}
          className="
            rounded-xl
            border
            border-border-subtle
            px-5
            py-3
            text-sm
            font-semibold
            text-foreground/80
            transition
            hover:bg-foreground/5
            disabled:opacity-50
          "
        >
          Abbrechen
        </button>



        <button
          type="submit"
          disabled={loading}
          className="
            rounded-xl
            bg-foreground
            px-6
            py-3
            text-sm
            font-semibold
            text-background
            transition
            hover:opacity-90
            disabled:opacity-50
          "
        >
          {loading
            ? "Erstelle..."
            : "Lead erstellen"
          }
        </button>


      </div>

    </form>
    


  </div>


</div>


  )
}