"use client"

import { useEffect, useState } from "react"

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

      const response = await fetch(
        "/api/sales-copilot",
        {
          method:"POST",
          headers:{
            "Content-Type":"application/json",
          },
          body:JSON.stringify({
            lead,
            activities,
            memory,
            risk,
            status,
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
      setError("AI Sales Copilot could not generate recommendations.")

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
      <div className="bg-[#111] rounded-xl p-6 text-zinc-400">
        🤖 AI Sales Copilot is preparing recommendations...
      </div>
    )

  }


  if(!data) return null

  if(error){

  return (
  <div className="bg-[#111] border border-red-500/20 rounded-xl p-6 text-red-300">
  {error}
  </div>
  )

  }


  return (

    <div className="bg-[#111] border border-cyan-500/20 rounded-xl p-6 space-y-6">

      <div className="flex items-start justify-between">

        <div>
          <h2 className="text-xl font-semibold text-white">
            🤖 AI Sales Copilot
          </h2>
          {data.strategy && (
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4">

          <h3 className="font-semibold text-cyan-300">
          🧠 Deal Strategy
          </h3>

          <p className="mt-2 text-sm text-zinc-200">
          {data.strategy}
          </p>

          </div>
          )}

          <p className="text-sm text-zinc-400 mt-1">
            AI-powered closing assistance
          </p>
        </div>


        <button
          onClick={generateCopilot}
          className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-black"
        >
          Regenerate
        </button>

      </div>


      <div>
        <h3 className="text-cyan-400 font-semibold">
          🎯 Call Preparation
        </h3>
        {data.dealSummary && (
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">

            <h3 className="text-white font-semibold">
              📌 Deal Summary
            </h3>

            <p className="mt-2 text-sm text-zinc-300">
              {data.dealSummary}
            </p>

          </div>
        )}


        <p className="text-white mt-2">
          {data.callPreparation?.goal}
        </p>


        <ul className="mt-3 space-y-2">

          {data.callPreparation?.talkingPoints?.map(
            (point:string)=>(
              <li
                key={point}
                className="text-sm text-zinc-300"
              >
                • {point}
              </li>
            )
          )}

        </ul>

      </div>



      <div>

        <h3 className="text-cyan-400 font-semibold">
          ❓ Questions to ask
        </h3>


        <ul className="mt-3 space-y-2">

          {data.callPreparation?.questions?.map(
            (q:string)=>(
              <li
                key={q}
                className="text-sm text-zinc-300"
              >
                • {q}
              </li>
            )
          )}

        </ul>

      </div>



      <div>

        <h3 className="text-cyan-400 font-semibold">
          ⚠️ Possible objections
        </h3>


        <div className="space-y-3 mt-3">

        {data.objections?.map(
          (item:any)=>(
            <div
              key={item.objection}
              className="border border-white/10 rounded-xl p-4"
            >

              <p className="text-white font-medium">
                {item.objection}
              </p>

              <p className="text-zinc-400 text-sm mt-2">
                {item.response}
              </p>

            </div>
          )
        )}

        </div>

      </div>



      <div>

        <h3 className="text-cyan-400 font-semibold">
          ✉️ Email Draft
        </h3>


        <div className="mt-2 bg-black/30 rounded-xl p-4 text-zinc-300 text-sm whitespace-pre-line">
          <div>
          <textarea
          value={data.emailDraft || ""}
          readOnly
          className="
          w-full
          min-h-48
          bg-black
          border
          border-white/10
          rounded-xl
          p-4
          text-sm
          text-zinc-200
          outline-none
          "
          />

          <button
          onClick={copyEmail}
          className="mt-3 rounded-xl bg-white px-4 py-2 font-semibold text-black"
          >
          {copied ? "Copied ✓" : "Copy Email"}
          </button>

          </div>
        </div>

      </div>


    </div>

  )
}