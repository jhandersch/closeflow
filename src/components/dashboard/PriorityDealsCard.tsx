"use client"

import { useRouter } from "next/navigation"
import { getHealthScore, getPriorityScore } from "@/lib/scoring"
import { usePriorityAI } from "@/hooks/usePriorityAI"
import { useAppPreferences } from "@/components/AppPreferencesProvider"
import { leadDisplayName, leadCompany } from "@/lib/utils"
import type { Lead } from "@/types"


type PriorityLead = Pick<Lead, "id" | "name" | "company" | "status" | "value" | "created_at" | "notes" | "stage_changed_at">


type PriorityDealsCardProps = {
  leads: PriorityLead[]
}



export default function PriorityDealsCard({
  leads,
}: PriorityDealsCardProps) {


  const router = useRouter()

  const {
    language,
    t,
  } = useAppPreferences()


  const aiAnalysis = usePriorityAI(
    leads,
    language
  )




  const translateRisk = (risk:string) => {

    if(risk === "High")
      return t(
        "dashboard.riskHigh",
        "High"
      )

    if(risk === "Medium")
      return t(
        "dashboard.riskMedium",
        "Medium"
      )

    return t(
      "dashboard.riskLow",
      "Low"
    )
  }





  return (

    <section
      className="
      rounded-2xl
      border
      border-border-subtle
      bg-surface-1
      p-6
      "
      aria-labelledby="priority-deals-heading"
    >



      <div className="flex items-center justify-between">


        <div>

          <p
            className="
            text-sm
            text-foreground/65
            "
          >
            {t(
              "dashboard.aiPriorityScoring",
              "AI priority scoring"
            )}
          </p>


          <h2
            id="priority-deals-heading"
            className="
            text-lg
            font-semibold
            text-foreground
            "
          >
            {t(
              "dashboard.dealsToFocus",
              "Deals to focus on"
            )}
          </h2>

        </div>



        <div className="text-sm text-foreground/55">

          {
            leads.length > 0
            ? `${t(
                "dashboard.top",
                "Top"
              )} ${leads.length}`
            : t(
                "dashboard.noPriorityDeals",
                "No priority deals"
              )
          }

        </div>


      </div>





      <div
        className="
        mb-5
        rounded-xl
        border
        border-cyan-500/20
        bg-cyan-500/10
        p-4
        "
      >


        <p
          className="
          text-xs
          uppercase
          tracking-wider
          text-cyan-400
          "
        >
          {t(
            "dashboard.aiRecommendation",
            "AI recommendation"
          )}
        </p>





        {
          aiAnalysis.headline && (

            <h3
              className="
              text-lg
              font-semibold
              text-foreground
              "
            >
              {aiAnalysis.headline}
            </h3>

          )
        }




        <p
          className="
          mt-2
          text-sm
          text-foreground/85
          "
        >
          {
            aiAnalysis.explanation ||
            t(
              "dashboard.analyzingPriority",
              "Analyzing priority opportunities..."
            )
          }
        </p>





        {
          aiAnalysis.priorityReason && (

            <p
              className="
              mt-3
              text-sm
              text-foreground/80
              "
            >

              <span className="text-cyan-400">
                {t(
                  "dashboard.why",
                  "Why"
                )}:
              </span>{" "}

              {aiAnalysis.priorityReason}

            </p>

          )
        }






        {
          aiAnalysis.riskLevel && (

            <div className="mt-4 flex items-center gap-3">


              <span className="text-sm text-foreground/65">
                {t(
                  "dashboard.risk",
                  "Risk"
                )}:
              </span>



              <span
                className={`
                rounded-full
                px-3
                py-1
                text-xs
                font-semibold

                ${
                  aiAnalysis.riskLevel === "High"
                  ? "bg-red-500/10 text-red-400 border border-red-500/20"

                  : aiAnalysis.riskLevel === "Medium"
                  ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"

                  : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                }
                `}
              >

                {translateRisk(aiAnalysis.riskLevel)}

              </span>


            </div>

          )
        }





        {
          aiAnalysis.nextAction && (

            <p
              className="
              mt-3
              text-sm
              text-cyan-300
              "
            >

              {t(
                "dashboard.next",
                "Next"
              )}:

              <span className="ml-1 text-foreground">
                {aiAnalysis.nextAction}
              </span>


            </p>

          )
        }


      </div>






      <div className="mt-5 space-y-3">


        {
          leads.map((lead)=>{


            const health = getHealthScore(lead)

            const priority = getPriorityScore(lead)



            const healthLabel =
              health >= 70
              ? t(
                  "dashboard.healthy",
                  "Healthy"
                )

              : health >= 50
              ? t(
                  "dashboard.watch",
                  "Watch"
                )

              : t(
                  "dashboard.atRisk",
                  "At risk"
                )





            const healthStyle =
              health >= 70
              ? "text-emerald-400 bg-emerald-500/10"

              : health >= 50
              ? "text-yellow-400 bg-yellow-500/10"

              : "text-red-400 bg-red-500/10"





            return (

              <button
                key={lead.id}
                onClick={() =>
                  router.push(`/leads/${lead.id}`)
                }
                className="
                w-full
                text-left
                rounded-xl
                border
                border-border-subtle
                bg-surface-2/70
                p-4
                transition
                hover:border-cyan-500/40
                hover:bg-surface-2/90
                "
              >



                <div className="flex items-start justify-between gap-4">


                  <div>

                    <p className="font-semibold text-foreground">
                      {leadDisplayName(lead)}
                    </p>


                    <p className="text-sm text-foreground/55">
                      {leadCompany(lead)}
                    </p>


                  </div>





                  <div className="text-right">


                    <p className="text-sm font-semibold text-cyan-400">
                      {t(
                        "dashboard.score",
                        "Score"
                      )} {priority}/100
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


                  <span
                    className="
                    rounded-full
                    bg-white/5
                    px-2
                    py-1
                    text-xs
                    uppercase
                    text-foreground/80
                    "
                  >

                    {lead.status}

                  </span>





                  <span className="font-semibold text-purple-400">

                    €{lead.value.toLocaleString("de-DE")}

                  </span>


                </div>





                <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">

                  <div
                    className={`
                    h-full
                    rounded-full

                    ${
                      priority >= 80
                      ? "bg-emerald-400"

                      : priority >= 50
                      ? "bg-yellow-400"

                      : "bg-red-400"
                    }
                    `}
                    style={{
                      width:`${priority}%`
                    }}
                  />


                </div>



              </button>

            )


          })
        }


      </div>


    </section>

  )
}