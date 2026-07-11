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

export function usePriorityAI(leads: any[]) {

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
            "AI analysis unavailable",

          explanation:
            "Unable to analyze opportunities right now.",

          nextAction:
            "Review your highest-value deals manually.",

          priorityReason:
            "No AI data available.",

          riskLevel:
            "Medium",
        })

      }

    }


    generate()

  }, [leads])


  return data
}