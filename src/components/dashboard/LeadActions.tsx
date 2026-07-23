"use client"

import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { useAppPreferences } from "@/components/AppPreferencesProvider"
import toast from "react-hot-toast"
import { useState } from "react"


type LeadActionsProps = {
  leadId: string
  currentStatus: string
  phone?: string | null
  email?: string | null
  onLeadDeleted?: () => void
}


const statuses = [
  {
    value: "new",
    de: "Neu",
    en: "New",
    color: "bg-blue-500/20 text-blue-300 border-blue-400/30"
  },
  {
    value: "contacted",
    de: "Kontaktiert",
    en: "Contacted",
    color: "bg-yellow-500/20 text-yellow-300 border-yellow-400/30"
  },
  {
    value: "qualified",
    de: "Qualifiziert",
    en: "Qualified",
    color: "bg-purple-500/20 text-purple-300 border-purple-400/30"
  },
  {
    value: "proposal",
    de: "Angebot",
    en: "Proposal",
    color: "bg-cyan-500/20 text-cyan-300 border-cyan-400/30"
  },
  {
    value: "won",
    de: "Gewonnen",
    en: "Won",
    color: "bg-green-500/20 text-green-300 border-green-400/30"
  },
  {
    value: "lost",
    de: "Verloren",
    en: "Lost",
    color: "bg-red-500/20 text-red-300 border-red-400/30"
  }
]


export default function LeadActions({
  leadId,
  currentStatus,
  phone,
  email,
  onLeadDeleted,
}: LeadActionsProps) {


  const router = useRouter()

  const {
    language
  } = useAppPreferences()

  const isDe = language === "de"


  const [openStatus, setOpenStatus] = useState(false)



  const getAuthHeaders = async () => {

    const {
      data:{
        session
      }
    } =
      await supabase.auth.getSession()


    return {

      Authorization:
        `Bearer ${session?.access_token || ""}`,

      "Content-Type":
        "application/json"

    }

  }




  const deleteLead = async () => {

    const confirmDelete =
      confirm(
        isDe
          ? "Diesen Lead löschen?"
          : "Delete this lead?"
      )


    if(!confirmDelete)
      return


    const headers =
      await getAuthHeaders()


    const response =
      await fetch(
        `/api/leads?id=${leadId}`,
        {
          method:"DELETE",
          headers,
          credentials:"include"
        }
      )


    const data =
      await response.json()


    if(!response.ok){

      toast.error(
        data.error ||
        "Delete failed"
      )

      return
    }


    toast.success(
      isDe
        ? "Lead gelöscht"
        : "Lead deleted"
    )


    onLeadDeleted?.()

    router.refresh()

  }




  const updateStatus = async (
    newStatus:string
  ) => {


    setOpenStatus(false)


    const headers =
      await getAuthHeaders()


    const response =
      await fetch(
        "/api/leads",
        {
          method:"PUT",
          headers,
          credentials:"include",
          body:JSON.stringify({

            id:leadId,

            status:newStatus

          })
        }
      )


    const data =
      await response.json()



    if(!response.ok){

      console.error(
        "UPDATE STATUS ERROR",
        data
      )

      toast.error(
        data.error ||
        "Update failed"
      )

      return

    }


    toast.success(
      isDe
        ? "Status geändert"
        : "Status updated"
    )


    router.refresh()

  }




  const current =
    statuses.find(
      item =>
        item.value === currentStatus
    )
    ||
    statuses[0]



  return (

    <div className="flex flex-wrap gap-2 mt-4">


      <button
        onClick={(e)=>{

          e.stopPropagation()

          if(phone)
            window.location.href =
              `tel:${phone}`

        }}

        disabled={!phone}

        className="
        rounded-lg
        border
        border-border-subtle
        bg-white/5
        px-3 py-1.5
        text-xs
        hover:bg-white/10
        disabled:opacity-40
        "
      >

        {isDe ? "Anrufen" : "Call"}

      </button>



      <button
        onClick={(e)=>{

          e.stopPropagation()

          if(email)
            window.location.href =
              `mailto:${email}`

        }}

        disabled={!email}

        className="
        rounded-lg
        border
        border-border-subtle
        bg-white/5
        px-3 py-1.5
        text-xs
        hover:bg-white/10
        disabled:opacity-40
        "
      >

        {isDe ? "E-Mail" : "Email"}

      </button>





      <div
        className="relative"
        onClick={(e)=>e.stopPropagation()}
      >

        <button

          onClick={()=>
            setOpenStatus(
              !openStatus
            )
          }

          className={`
          rounded-lg
          border
          px-3 py-1.5
          text-xs
          ${current.color}
          `}
        >

          {isDe
            ? current.de
            : current.en
          }

          <span className="ml-2">
            ▾
          </span>

        </button>



        {openStatus && (

          <div
            className="
            absolute
            z-50
            mt-2
            w-44
            rounded-xl
            border
            border-white/10
            bg-slate-900
            p-2
            shadow-xl
            "
          >

            {statuses.map(status=>(

              <button

                key={status.value}

                onClick={()=>
                  updateStatus(
                    status.value
                  )
                }

                className={`
                w-full
                rounded-lg
                px-3
                py-2
                text-left
                text-xs
                hover:bg-white/10
                ${status.color}
                mb-1
                `}
              >

                {isDe
                  ? status.de
                  : status.en
                }

              </button>

            ))}

          </div>

        )}

      </div>





      <button

        onClick={(e)=>{

          e.stopPropagation()

          void deleteLead()

        }}

        className="
        rounded-lg
        border
        border-red-500/30
        bg-red-500/10
        px-3 py-1.5
        text-xs
        text-red-300
        hover:bg-red-500/20
        "
      >

        {isDe
          ? "Löschen"
          : "Delete"
        }

      </button>





      <button

        onClick={(e)=>{

          e.stopPropagation()

          router.push(
            `/leads/${leadId}`
          )

        }}

        className="
        rounded-lg
        border
        border-cyan-400/30
        bg-cyan-400/10
        px-3 py-1.5
        text-xs
        text-cyan-300
        "
      >

        {isDe
          ? "Öffnen"
          : "Open"
        }

      </button>


    </div>

  )

}