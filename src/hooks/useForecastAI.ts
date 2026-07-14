"use client"

import { useEffect, useState } from "react"
import {
  getHealthScore,
  getCloseProbability,
  analyzeLead,
} from "@/lib/scoring"


type ForecastAI = {

  summary: string

  positiveFactors: string[]

  risks: string[]

  recommendation: string

}




export function useForecastAI(
  pipelineValue: number,
  weightedRevenue: number,
  revenueAtRisk: number,
  leads: any[],
  language: "de" | "en" = "de"
) {


  const [analysis, setAnalysis] =
    useState<ForecastAI | null>(null)


  const [loading, setLoading] =
    useState(false)






  useEffect(() => {


    if (!leads.length) {

      return

    }






    async function generate() {


      setLoading(true)




      try {



        const analyzedLeads =

          leads

          .filter(
            lead =>
              lead.status !== "won" &&
              lead.status !== "lost"
          )


          .map(
            lead => ({

              name:
                lead.name,


              company:
                lead.company,


              status:
                lead.status,


              value:
                lead.value,


              health:
                getHealthScore(
                  lead
                ),


              probability:
                getCloseProbability(
                  lead
                ),


              analysis:
                analyzeLead(
                  lead
                ),


              created_at:
                lead.created_at,


              stage_changed_at:
                lead.stage_changed_at,


              notes:
                lead.notes ?? "",


              next_action:
                lead.next_action ?? null,


            })
          )

          .sort(
            (a,b) =>
              b.value -
              a.value
          )

          .slice(0,10)







        const pipelineCoverage =

          pipelineValue > 0

            ? Math.round(
                (
                  weightedRevenue /
                  pipelineValue
                ) *
                100
              )

            : 0






        const res =
          await fetch(
            "/api/forecast-ai",
            {


              method:
                "POST",



              headers:{

                "Content-Type":
                  "application/json",

              },



              body:
                JSON.stringify({

                  language,


                  pipelineValue,


                  weightedRevenue,


                  revenueAtRisk,


                  pipelineCoverage,


                  leads:
                    analyzedLeads,


                }),


            }
          )







        if (!res.ok) {

          throw new Error(
            "Forecast AI failed"
          )

        }







        const data =
          await res.json()






        setAnalysis({

          summary:
            data.summary ??
            "",


          positiveFactors:
            data.positiveFactors ??
            [],


          risks:
            data.risks ??
            [],


          recommendation:
            data.recommendation ??
            "",

        })






      } catch(error) {


        console.error(
          "FORECAST AI ERROR:",
          error
        )



        setAnalysis({

          summary:
            language === "de"
            ? "Forecast-Analyse nicht verfügbar."
            : "Forecast analysis unavailable.",



          positiveFactors:
            [],



          risks:
            [],



          recommendation:
            language === "de"
            ? "Pipeline manuell prüfen."
            : "Review pipeline manually.",


        })

      }






      setLoading(false)

    }






    generate()



  }, [
    language,
    pipelineValue,
    weightedRevenue,
    revenueAtRisk,
    leads,
  ])






  return {

    analysis,

    loading,

  }

}