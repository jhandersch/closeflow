import { calculateSalesScore } from "@/lib/salesScore"
import { getStaleDays } from "@/lib/scoring"
import type { Lead } from "@/types"


export function calculateForecast(
  leads: Lead[]
) {

  let pipelineValue = 0
  let weightedRevenue = 0
  let revenueAtRisk = 0

  let commitRevenue = 0
  let bestCaseRevenue = 0

  let totalHealth = 0
  let totalProbability = 0

  let activeDeals = 0


  const monthlyMap =
    new Map<string, number>()



  for (const lead of leads) {


    const staleDays =
      getStaleDays(lead)



    const score =
      calculateSalesScore(
        lead,
        staleDays
      )



    const value =
      Number(
        lead.value || 0
      )



    pipelineValue += value



    weightedRevenue +=
      value *
      (
        score.probability / 100
      )



    totalHealth +=
      score.health


    totalProbability +=
      score.probability



    /*
      ACTIVE DEALS

      gewonnen/verloren nicht zählen
    */

    if(
      lead.status !== "won" &&
      lead.status !== "lost"
    ){

      activeDeals++

    }



    /*
      COMMIT REVENUE

      sehr wahrscheinliche Deals
    */

    if(
      score.probability >= 75 &&
      score.risk < 50
    ){

      commitRevenue += value

    }



    /*
      BEST CASE

      mögliche Deals
    */

    else if(
      score.probability >= 45
    ){

      bestCaseRevenue += value

    }



    /*
      RISIKO
    */

    if(
      score.risk >= 60
    ){

      revenueAtRisk += value

    }




    /*
      Monatlicher Forecast

      für Chart
    */

    const date =
      lead.expected_close_at
        ? new Date(
            lead.expected_close_at
          )
        : new Date(
            lead.created_at
          )


    const month =
      date.toLocaleDateString(
        "en-US",
        {
          month:"short",
          year:"2-digit"
        }
      )



    const weighted =
      value *
      (
        score.probability / 100
      )


    monthlyMap.set(
      month,
      (
        monthlyMap.get(month)
        || 0
      )
      +
      weighted
    )

  }



  const averageHealth =
    leads.length
      ? Math.round(
          totalHealth /
          leads.length
        )
      : 0



  const averageProbability =
    leads.length
      ? Math.round(
          totalProbability /
          leads.length
        )
      : 0



  const confidence =
    pipelineValue > 0
      ? Math.round(
          (
            weightedRevenue /
            pipelineValue
          )
          *
          100
        )
      : 0




  return {

    pipelineValue,

    weightedRevenue,

    revenueAtRisk,


    commitRevenue,

    bestCaseRevenue,


    confidence,


    averageHealth,

    averageProbability,


    activeDeals,


    monthlyForecast:
      Array.from(
        monthlyMap.entries()
      )
      .map(
        ([
          month,
          value
        ])=>({
          month,
          value
        })
      )

  }

}