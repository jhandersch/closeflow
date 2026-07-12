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


  async function generateCopilot() {

    setLoading(true)

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


      const result = await response.json()

      setData(result)


    } catch(error){

      console.error(error)

    }


    setLoading(false)
  }


  useEffect(() => {

    if(lead){
      generateCopilot()
    }

  },[lead])


  if(loading){

    return (
      <div className="bg-[#111] rounded-xl p-6 text-zinc-400">
        🤖 AI Sales Copilot is preparing recommendations...
      </div>
    )

  }


  if(!data) return null


  return (

    <div className="bg-[#111] border border-cyan-500/20 rounded-xl p-6 space-y-6">

      <div>
        <h2 className="text-xl font-semibold text-white">
          🤖 AI Sales Copilot
        </h2>

        <p className="text-sm text-zinc-400 mt-1">
          AI-powered closing assistance
        </p>
      </div>


      <div>

        <h3 className="text-cyan-400 font-semibold">
          🎯 Call Preparation
        </h3>


        <p className="text-white mt-2">
          {data.callPreparation.goal}
        </p>


        <ul className="mt-3 space-y-2">

          {data.callPreparation.talkingPoints?.map(
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

          {data.callPreparation.questions?.map(
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
          {data.emailDraft}
        </div>

      </div>


    </div>

  )
}