"use client"

import { useEffect, useState } from "react"
import { leadDisplayName, leadCompany } from "@/lib/utils"

type PriorityAIResult = {
  headline: string
  explanation: string
  nextAction: string
  priorityReason: string
  riskLevel: "Low" | "Medium" | "High"
}

export function usePriorityAI(leads: any[], language: "de" | "en" = "de") {

  const [data, setData] = useState<PriorityAIResult>({
    headline: "",
    explanation: "",
    nextAction: "",
    priorityReason: "",
    riskLevel: "Medium",
  })

  useEffect(() => {

    if (!leads.length) return

    async function generate() {

      try {

        const response = await fetch("/api/priority-ai", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            language,
            leads: leads.slice(0,4).map((lead) => ({
              name: leadDisplayName(lead),
              company: leadCompany(lead),
              status: lead.status,
              value: lead.value,
              created_at: lead.created_at,
              notes: lead.notes ?? "",
            })),
          }),
        })


        const result = await response.json()

        setData(result)

      } catch {

        setData({
          headline:
            language === "de" ? "KI-Analyse nicht verfügbar" : "AI analysis unavailable",

          explanation:
            language === "de" ? "Opportunities können aktuell nicht analysiert werden." : "Unable to analyze opportunities right now.",

          nextAction:
            language === "de" ? "Prüfe deine wertvollsten Deals manuell." : "Review your highest-value deals manually.",

          priorityReason:
            language === "de" ? "Keine KI-Daten verfügbar." : "No AI data available.",

          riskLevel:
            "Medium",
        })

      }

    }


    generate()

  }, [language, leads])


  return data
}