import type { Lead } from "@/types"


type ScoreResult = {
  priority: number
  health: number
  activity: number
  engagement: number
  risk: number
  probability: number
}



export function calculateSalesScore(
  lead: Lead,
  staleDays: number
): ScoreResult {


  /*
    DEAL VALUE SCORE
    Große Deals bekommen mehr Gewicht
  */

  const valueScore =
    Math.min(
      100,
      Math.round(
        ((lead.value || 0) / 50000) * 100
      )
    )



  /*
    PIPELINE STAGE
  */

  const stageScore =
    lead.status === "won"
      ? 100
      : lead.status === "proposal"
      ? 80
      : lead.status === "contacted"
      ? 50
      : 25



  /*
    ACTIVITY MOMENTUM

    Frische Aktivität = besser
  */

  const activityScore =
    staleDays === 0
      ? 100
      : staleDays <= 3
      ? 85
      : staleDays <= 7
      ? 60
      : staleDays <= 14
      ? 35
      : 15



  /*
    ENGAGEMENT

    Kombination aus Stage + Aktivität
  */

  const engagement =
    Math.round(
      (stageScore * 0.5)
      +
      (activityScore * 0.5)
    )



  /*
    RISK

    Inaktivität erhöht Risiko
  */

  const risk =
    staleDays > 14
      ? 90
      : staleDays > 7
      ? 60
      : 20



  /*
    HEALTH

    Gegenteil von Risiko,
    aber mit Aktivität kombiniert
  */

  const health =
    Math.round(
      (activityScore * 0.6)
      +
      ((100-risk) * 0.4)
    )



  /*
    FINAL CONVERSION PROBABILITY

    Gewichtung:

    30% Value
    25% Stage
    20% Activity
    15% Engagement
    10% Risk
  */


  const probability =
    Math.round(

      (valueScore * 0.30)

      +

      (stageScore * 0.25)

      +

      (activityScore * 0.20)

      +

      (engagement * 0.15)

      +

      ((100-risk) * 0.10)

    )



  return {

    priority:
      Math.round(
        (valueScore * 0.4)
        +
        (stageScore * 0.3)
        +
        (activityScore * 0.3)
      ),


    health,

    activity:
      activityScore,


    engagement,


    risk,


    probability,

  }

}