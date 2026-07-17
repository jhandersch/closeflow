"use client"

import { useEffect, useState } from "react"
import { useAppPreferences } from "@/components/AppPreferencesProvider"
import { supabase } from "@/lib/supabase/client"

type Props = {
  lead: any
  activities: any[]
  memory: any
  risk: any
  status: string
}

export default function AISalesCopilot({
  lead,
  activities,
  memory,
  risk,
  status,
}: Props) {
  const { language } = useAppPreferences()

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [copied, setCopied] = useState(false)

  async function copyEmail() {
    await navigator.clipboard.writeText(data.emailDraft)

    setCopied(true)

    setTimeout(() => {
      setCopied(false)
    }, 2000)
  }


  async function generateCopilot() {

    if (loading) return

    setLoading(true)
    setError(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error(language === "de" ? "Bitte melde dich erneut an." : "Please sign in again.")
      }

      const response = await fetch(
        "/api/sales-copilot",
        {
          method:"POST",
          credentials: "include",
          headers:{
            "Content-Type":"application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body:JSON.stringify({
            lead,
            activities,
            memory,
            risk,
            status,
            language,
          }),
        }
      )


      if(!response.ok){
        throw new Error("Copilot failed")
      }


      const result = await response.json()

      setData(result)


    } catch(error){

      console.error(error)
      setError(language === "de" ? "Der KI-Vertriebsassistent konnte keine Empfehlungen erstellen." : "AI Sales Copilot could not generate recommendations.")

    }


    setLoading(false)
  }


  useEffect(() => {
    if(lead){
      generateCopilot()
    }
  },[lead.id])


  if(loading){

    return (
      <div className="bg-surface-1 rounded-xl p-6 text-foreground/65">
        {language === "de" ? "KI-Vertriebsassistent erstellt Empfehlungen..." : "AI Sales Copilot is preparing recommendations..."}
      </div>
    )

  }


  if(!data) return null

  if(error){

  return (
  <div className="bg-surface-1 border border-red-500/20 rounded-xl p-6 text-red-300">
  {error}
  </div>
  )

  }


  return (

    <div className="bg-surface-1 border border-cyan-500/20 rounded-xl p-6 space-y-6">

      <div className="flex items-start justify-between">

        <div>
          <h2 className="text-xl font-semibold text-foreground">
            {language === "de" ? "KI-Vertriebsassistent" : "AI Sales Copilot"}
          </h2>
          {data.strategy && (
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4">

          <h3 className="font-semibold text-cyan-300">
          {language === "de" ? "Deal-Strategie" : "Deal Strategy"}
          </h3>

          <p className="mt-2 text-sm text-foreground/85">
          {data.strategy}
          </p>

          </div>
          )}

          <p className="text-sm text-foreground/65 mt-1">
            {language === "de" ? "KI-gestützte Unterstützung für den Abschluss" : "AI-powered closing assistance"}
          </p>
        </div>


        <button
          onClick={generateCopilot}
          className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-black"
        >
          {language === "de" ? "Neu generieren" : "Regenerate"}
        </button>

      </div>


      <div>
        <h3 className="text-cyan-400 font-semibold">
          {language === "de" ? "Gesprächsvorbereitung" : "Call Preparation"}
        </h3>
        {data.dealSummary && (
          <div className="rounded-xl border border-border-subtle bg-surface-2/70 p-4">

            <h3 className="text-foreground font-semibold">
              {language === "de" ? "Deal-Zusammenfassung" : "Deal Summary"}
            </h3>

            <p className="mt-2 text-sm text-foreground/80">
              {data.dealSummary}
            </p>

          </div>
        )}


        <p className="text-foreground mt-2">
          {data.callPreparation?.goal}
        </p>


        <ul className="mt-3 space-y-2">

          {data.callPreparation?.talkingPoints?.map(
            (point:string)=>(
              <li
                key={point}
                className="text-sm text-foreground/80"
              >
                - {point}
              </li>
            )
          )}

        </ul>

      </div>



      <div>

        <h3 className="text-cyan-400 font-semibold">
          {language === "de" ? "Fragen für das Gespräch" : "Questions to ask"}
        </h3>


        <ul className="mt-3 space-y-2">

          {data.callPreparation?.questions?.map(
            (q:string)=>(
              <li
                key={q}
                className="text-sm text-foreground/80"
              >
                - {q}
              </li>
            )
          )}

        </ul>

      </div>



      <div>

        <h3 className="text-cyan-400 font-semibold">
          {language === "de" ? "Mögliche Einwände" : "Possible objections"}
        </h3>


        <div className="space-y-3 mt-3">

        {data.objections?.map(
          (item:any)=>(
            <div
              key={item.objection}
              className="border border-border-subtle rounded-xl p-4"
            >

              <p className="text-foreground font-medium">
                {item.objection}
              </p>

              <p className="text-foreground/65 text-sm mt-2">
                {item.response}
              </p>

            </div>
          )
        )}

        </div>

      </div>



      <div>

        <h3 className="text-cyan-400 font-semibold">
          {language === "de" ? "E-Mail-Entwurf" : "Email Draft"}
        </h3>


        <div className="mt-2 bg-surface-2/70 rounded-xl p-4 text-foreground/80 text-sm whitespace-pre-line">
          <div>
          <textarea
          value={data.emailDraft || ""}
          readOnly
          className="
          w-full
          min-h-48
          bg-surface-2
          border
          border-border-subtle
          rounded-xl
          p-4
          text-sm
          text-foreground/85
          outline-none
          "
          />

          <button
          onClick={copyEmail}
          className="mt-3 rounded-xl bg-white px-4 py-2 font-semibold text-black"
          >
          {copied ? (language === "de" ? "Kopiert" : "Copied") : (language === "de" ? "E-Mail kopieren" : "Copy Email")}
          </button>

          </div>
        </div>

      </div>


    </div>

  )
}
