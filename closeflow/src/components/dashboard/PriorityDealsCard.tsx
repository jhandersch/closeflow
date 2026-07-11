"use client"

import { useRouter } from "next/navigation"
import { getHealthScore, getPriorityScore } from "@/lib/scoring"

type PriorityLead = {
  id: string
  name: string
  company: string
  status: string
  value: number
  created_at: string
}

type PriorityDealsCardProps = {
  leads: PriorityLead[]
}

export default function PriorityDealsCard({ leads }: PriorityDealsCardProps) {

  const router = useRouter()


  return (

    <section
      className="rounded-2xl border border-white/10 bg-[#111] p-6"
      aria-labelledby="priority-deals-heading"
    >

      <div className="flex items-center justify-between">

        <div>
          <p className="text-sm text-zinc-400">
            AI priority scoring
          </p>

          <h2
            id="priority-deals-heading"
            className="text-lg font-semibold text-white"
          >
            Deals to focus on
          </h2>
        </div>


        <div className="text-sm text-zinc-500">
          Top {leads.length}
        </div>

      </div>



      <div className="mt-5 space-y-3">

        {leads.map((lead) => {

          const health = getHealthScore(lead)
          const priority = getPriorityScore(lead)


          const healthLabel =
            health >= 70
              ? "Healthy"
              : health >= 50
              ? "Watch"
              : "At risk"


          const healthStyle =
            health >= 70
              ? "text-emerald-400 bg-emerald-500/10"
              : health >= 50
              ? "text-yellow-400 bg-yellow-500/10"
              : "text-red-400 bg-red-500/10"



          return (

            <button
              key={lead.id}
              onClick={() => router.push(`/leads/${lead.id}`)}
              className="
                w-full
                text-left
                rounded-xl
                border
                border-white/10
                bg-black/30
                p-4
                transition
                hover:border-cyan-500/40
                hover:bg-black/50
              "
            >


              <div className="flex items-start justify-between gap-4">


                <div>

                  <p className="font-semibold text-white">
                    {lead.name}
                  </p>


                  <p className="text-sm text-zinc-500">
                    {lead.company}
                  </p>


                </div>



                <div className="text-right">

                  <p className="text-sm font-semibold text-cyan-400">
                    ⚡ {priority}/100
                  </p>


                  <span
                    className={`
                      inline-block
                      mt-1
                      rounded-full
                      px-2
                      py-1
                      text-xs
                      ${healthStyle}
                    `}
                  >
                    {healthLabel}
                  </span>


                </div>


              </div>



              <div className="mt-4 flex justify-between text-sm">

                <span className="text-zinc-400">
                  Stage:
                  <span className="ml-1 text-white">
                    {lead.status}
                  </span>
                </span>



                <span className="font-semibold text-purple-400">
                  €
                  {lead.value.toLocaleString("de-DE")}
                </span>


              </div>



              <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">

                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                  style={{
                    width: `${priority}%`
                  }}
                />

              </div>


            </button>

          )

        })}


      </div>


    </section>

  )
}