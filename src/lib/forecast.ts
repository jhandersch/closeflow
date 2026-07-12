import { calculateSalesScore } from "@/lib/salesScore"
import { getStaleDays } from "@/lib/scoring"

export function calculateForecast(leads: any[]) {

  let pipelineValue = 0
  let weightedRevenue = 0
  let revenueAtRisk = 0


  for (const lead of leads) {

    const staleDays = getStaleDays(lead)

    const score = calculateSalesScore(
      lead,
      staleDays
    )


    pipelineValue += lead.value || 0


    weightedRevenue +=
      (lead.value || 0) *
      (score.probability / 100)


    if (score.risk >= 60) {
      revenueAtRisk += lead.value || 0
    }

  }


  return {
    pipelineValue,
    weightedRevenue,
    revenueAtRisk,
  }

}