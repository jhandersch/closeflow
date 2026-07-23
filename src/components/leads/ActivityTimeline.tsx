"use client"

import { useMemo, useState } from "react"
import { useAppPreferences } from "@/components/AppPreferencesProvider"
import type { Activity, ActivityType } from "@/types"

type ActivityTimelineProps = {
  activities: Activity[]
}

export default function ActivityTimeline({
  activities,
}: ActivityTimelineProps) {

  const { language } = useAppPreferences()
  const isDe = language === "de"


  const [filter, setFilter] =
    useState<
      "all" | "calls" | "emails" | "changes" | "ai"
    >("all")



  const getActivityIcon = (
    type?: ActivityType | string
  ) => {

    switch(type){

      case "status_changed":
      case "status_change":
        return "SC"

      case "note_added":
        return "NT"

      case "email_sent":
        return "EM"

      case "call_completed":
        return "CL"

      case "task_created":
        return "TC"

      case "task_completed":
        return "TD"

      case "created":
        return "NW"

      case "ai":
        return "KI"

      default:
        return "EV"

    }

  }




  const filteredActivities =
    useMemo(()=>{

      if(filter==="all")
        return activities


      if(filter==="calls")
        return activities.filter(
          a=>a.type==="call_completed"
        )


      if(filter==="emails")
        return activities.filter(
          a=>a.type==="email_sent"
        )


      if(filter==="ai")
        return activities.filter(
          a=>a.type==="ai"
        )


      return activities.filter(
        a =>
          a.type==="status_changed" ||
          a.type==="note_added" ||
          a.type==="task_created" ||
          a.type==="task_completed" ||
          a.type==="created"
      )


    },[
      activities,
      filter
    ])






  const getTypeLabel = (
    type?: ActivityType | string
  )=>{

    switch(type){

      case "status_changed":
      case "status_change":

        return isDe
        ? "Statuswechsel"
        : "Status Change"


      case "note_added":

        return isDe
        ? "Notiz"
        : "Note"


      case "email_sent":

        return isDe
        ? "E-Mail"
        : "Email"


      case "call_completed":

        return isDe
        ? "Anruf"
        : "Call"


      case "task_created":
      case "task_completed":

        return isDe
        ? "Aufgabe"
        : "Task"


      case "created":

        return isDe
        ? "Erstellt"
        : "Created"


      case "ai":

        return isDe
        ? "KI"
        : "AI"


      default:

        return isDe
        ? "Ereignis"
        : "Event"

    }

  }






  const getLocalizedAction = (
    action:string
  )=>{


    const statusMap = {

      new:{
        de:"Neu",
        en:"New"
      },

      contacted:{
        de:"Kontaktiert",
        en:"Contacted"
      },

      qualified:{
        de:"Qualifiziert",
        en:"Qualified"
      },

      proposal:{
        de:"Angebot",
        en:"Proposal"
      },

      won:{
        de:"Gewonnen",
        en:"Won"
      },

      lost:{
        de:"Verloren",
        en:"Lost"
      }

    }



    const statusRegex =
      /status\s*(?:geändert|changed)\s*(?:von|from)\s+(.+?)\s+(?:zu|to)\s+(.+)/i



    const match =
      action.match(statusRegex)



    if(match){

      const oldStatus =
        match[1]
          .trim()
          .toLowerCase()


      const newStatus =
        match[2]
          .trim()
          .toLowerCase()



      const oldText =
        Object.values(statusMap)
          .find(
            x =>
              x.de.toLowerCase()===oldStatus ||
              x.en.toLowerCase()===oldStatus
          )


      const newText =
        Object.values(statusMap)
          .find(
            x =>
              x.de.toLowerCase()===newStatus ||
              x.en.toLowerCase()===newStatus
          )



      if(isDe){

        return (
          `Status geändert von ${
            oldText?.de ?? match[1]
          } zu ${
            newText?.de ?? match[2]
          }`
        )

      }


      return (
        `Status changed from ${
          oldText?.en ?? match[1]
        } to ${
          newText?.en ?? match[2]
        }`
      )

    }




    const translations = isDe
      ? {

          "lead created":
            "Lead erstellt",

          "lead imported from csv":
            "Lead aus CSV importiert",

          "lead notes updated":
            "Lead-Notizen aktualisiert",

          "lead details updated":
            "Lead-Details aktualisiert",

          "task completed":
            "Aufgabe erledigt",

          "email sent":
            "E-Mail gesendet"

        }
      : {

          "lead erstellt":
            "Lead created",

          "lead created":
            "Lead created",

          "email gesendet":
            "Email sent",

          "task erledigt":
            "Task completed"

        }



    return (
      translations[
        action.toLowerCase() as keyof typeof translations
      ]
      ??
      action
    )

  }






  return (

    <div className="rounded-xl bg-surface-1 p-6">

      <h2 className="mb-4 text-xl font-semibold text-foreground">

        {
          isDe
          ? "Aktivitätsverlauf"
          : "Activity Timeline"
        }

      </h2>



      <div className="mb-4 flex flex-wrap gap-2">

        {
          [
            ["all", isDe?"Alle":"All"],
            ["calls", isDe?"Anrufe":"Calls"],
            ["emails", isDe?"E-Mails":"Emails"],
            ["changes", isDe?"Änderungen":"Changes"],
            ["ai", isDe?"KI":"AI"],
          ].map(([key,label])=>(

            <button
              key={key}
              onClick={()=>
                setFilter(
                  key as typeof filter
                )
              }
              className={`
              rounded-full
              px-3 py-1
              text-xs
              ${
                filter===key
                ?
                "bg-foreground text-background"
                :
                "bg-surface-2/80 text-foreground/80"
              }
              `}
            >
              {label}
            </button>

          ))
        }

      </div>





      {
        filteredActivities.length===0

        ?

        <p className="text-foreground/55">
          {
            isDe
            ?
            "Noch keine Aktivitäten."
            :
            "No activities yet."
          }
        </p>


        :

        <div className="space-y-3">

          {
            filteredActivities.map(a=>(

              <div
                key={a.id}
                className="border-b border-border-subtle pb-3"
              >

                <div className="flex items-center gap-3">


                  <span className="
                    inline-flex
                    h-7 w-7
                    items-center
                    justify-center
                    rounded-full
                    border
                    border-cyan-500/20
                    bg-cyan-500/10
                    text-[10px]
                    font-semibold
                    text-cyan-300
                  ">
                    {getActivityIcon(a.type)}
                  </span>



                  <div>

                    <p className="font-medium text-foreground">

                      {
                        a.type==="ai"
                        ?
                        (
                          isDe
                          ?
                          "KI-Assistent: "
                          :
                          "AI Assistant: "
                        )
                        :
                        ""
                      }


                      {
                        getLocalizedAction(
                          a.title ||
                          a.action ||
                          "Activity updated"
                        )
                      }


                    </p>



                    <p className="text-xs text-foreground/55">
                      {getTypeLabel(a.type)}
                    </p>



                    <p className="mt-1 text-xs text-foreground/55">

                      {
                        new Date(
                          a.created_at
                        )
                        .toLocaleString(
                          isDe
                          ?
                          "de-DE"
                          :
                          "en-US",
                          {
                            dateStyle:"medium",
                            timeStyle:"short"
                          }
                        )
                      }

                    </p>


                  </div>

                </div>

              </div>

            ))
          }

        </div>

      }


    </div>

  )

}