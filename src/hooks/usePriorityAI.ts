"use client"

import { useEffect, useState } from "react"
import { leadDisplayName, leadCompany } from "@/lib/utils"
import {
  analyzeLead,
  getHealthScore,
  getPriorityScore,
  getCloseProbability,
} from "@/lib/scoring"


type PriorityAIResult = {

  headline: string

  explanation: string

  nextAction: string

  priorityReason: string

  riskLevel:
    | "Low"
    | "Medium"
    | "High"

}




export function usePriorityAI(
  leads: any[],
  language: "de" | "en" = "de"
) {


  const [data, setData] =
    useState<PriorityAIResult>({

      headline: "",

      explanation: "",

      nextAction: "",

      priorityReason: "",

      riskLevel: "Medium",

    })





  useEffect(() => {


    if (!leads.length) {

      setData({

        headline:
          language === "de"
          ? "Keine Prioritäten vorhanden"
          : "No priorities available",


        explanation:
          language === "de"
          ? "Füge Leads hinzu, um KI-Empfehlungen zu erhalten."
          : "Add leads to receive AI recommendations.",


        nextAction:
          language === "de"
          ? "Erstelle neue Opportunities."
          : "Create new opportunities.",


        priorityReason:
          language === "de"
          ? "Keine Daten verfügbar."
          : "No data available.",


        riskLevel:
          "Low",

      })


      return

    }






    async function generate() {


      try {


        const scoredLeads =
          leads
          .filter(
            lead =>
              lead.status !== "won" &&
              lead.status !== "lost"
          )
          .map(
            lead => ({

              ...lead,

              priority:
                getPriorityScore(lead),


              health:
                getHealthScore(lead),


              probability:
                getCloseProbability(lead),


              analysis:
                analyzeLead(lead),

            })
          )
          .sort(
            (a,b)=>
              b.priority -
              a.priority
          )
          .slice(0,4)







        const response =
          await fetch(
            "/api/priority-ai",
            {

              method:"POST",

              headers:{
                "Content-Type":
                  "application/json",
              },


              body:
                JSON.stringify({

                  language,


                  leads:
                    scoredLeads.map(
                      lead => ({

                        name:
                          leadDisplayName(
                            lead
                          ),


                        company:
                          leadCompany(
                            lead
                          ),


                        status:
                          lead.status,


                        value:
                          lead.value,


                        priority:
                          lead.priority,


                        health:
                          lead.health,


                        probability:
                          lead.probability,


                        urgency:
                          lead.analysis.urgency,


                        reasons:
                          lead.analysis.reasons,


                        created_at:
                          lead.created_at,


                        stage_changed_at:
                          lead.stage_changed_at,


                        notes:
                          lead.notes ?? "",


                        next_action:
                          lead.next_action ?? null,

                      })
                    ),

                }),

            }
          )






        if (!response.ok) {

          throw new Error(
            "Priority AI request failed"
          )

        }







        const result =
          await response.json()






        setData({

          headline:
            result.headline ??
            "",


          explanation:
            result.explanation ??
            "",


          nextAction:
            result.nextAction ??
            "",


          priorityReason:
            result.priorityReason ??
            "",


          riskLevel:
            result.riskLevel ??
            "Medium",

        })





      } catch(error) {


        console.error(
          "Priority AI error:",
          error
        )



        const highest =
          leads
          .filter(
            lead =>
              lead.status !== "won" &&
              lead.status !== "lost"
          )
          .sort(
            (a,b)=>
              getPriorityScore(b) -
              getPriorityScore(a)
          )[0]







        setData({

          headline:
            language === "de"
            ? highest
              ? `${leadDisplayName(highest)} benötigt Aufmerksamkeit`
              : "KI-Analyse nicht verfügbar"
            : highest
              ? `${leadDisplayName(highest)} needs attention`
              : "AI analysis unavailable",





          explanation:
            language === "de"
            ? highest
              ? "Dieses Geschäft wurde anhand von Wert, Stadium und Aktivität priorisiert."
              : "Opportunities können aktuell nicht analysiert werden."
            : highest
              ? "This opportunity was prioritized using value, stage and activity signals."
              : "Unable to analyze opportunities right now.",





          nextAction:
            language === "de"
            ? highest?.next_action ??
              "Prüfe deine wichtigsten Deals manuell."
            : highest?.next_action ??
              "Review your highest-value deals manually.",





          priorityReason:
            language === "de"
            ? highest
              ? analyzeLead(highest)
                  .reasons
                  .join(" ")
              : "Keine KI-Daten verfügbar."
            : highest
              ? analyzeLead(highest)
                  .reasons
                  .join(" ")
              : "No AI data available.",





          riskLevel:
            highest
            ? getHealthScore(highest) < 50
              ? "High"
              : getHealthScore(highest) < 70
              ? "Medium"
              : "Low"
            : "Medium",


        })

      }


    }





    generate()



  }, [
    language,
    leads,
  ])





  return data

}