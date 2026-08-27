import type { Lead } from "@/types"

export type ScoreResult = {
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
    =========================
    DEAL VALUE
    =========================

    €50.000 = 100 Punkte
  */

  const valueScore =
    Math.min(
      100,
      Math.round(
        ((lead.value || 0) / 50000) * 100
      )
    )


  /*
    =========================
    PIPELINE STAGE
    =========================

    Höhere Phase =
    höhere Abschlusswahrscheinlichkeit.
  */

  const stageScore: Record<string, number> = {
    new: 25,
    contacted: 50,
    qualified: 65,
    proposal: 80,
    won: 100,
    lost: 0,
  }

  const currentStageScore =
    stageScore[lead.status] ?? 25


  /*
    =========================
    ACTIVITY
    =========================

    Frische Leads sind gesünder.
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
    =========================
    ENGAGEMENT
    =========================

    Pipeline-Fortschritt +
    Aktivität.
  */

  const engagement =
    Math.round(
      (currentStageScore * 0.5) +
      (activityScore * 0.5)
    )


  /*
    =========================
    RISK
    =========================

    Inaktivität erhöht Risiko.
  */

  const risk =
    staleDays > 14
      ? 90
      : staleDays > 7
        ? 60
        : staleDays > 3
          ? 40
          : 20


  /*
    =========================
    HEALTH
    =========================

    Aktivität + geringes Risiko.
  */

  const health =
    Math.round(
      (activityScore * 0.6) +
      ((100 - risk) * 0.4)
    )


  /*
    =========================
    CLOSE PROBABILITY
    =========================

    Gewichtung:

    Value       30%
    Stage       25%
    Activity    20%
    Engagement  15%
    Risk        10%
  */

  let probability =
    Math.round(
      (currentStageScore * 0.40) +
      (activityScore * 0.25) +
      (engagement * 0.20) +
      (valueScore * 0.05) +
      ((100 - risk) * 0.10)
    )


  /*
    WON / LOST SIND FINALE ZUSTÄNDE
  */

  if (lead.status === "won") {
    probability = 100
  }

  if (lead.status === "lost") {
    probability = 0
  }


  /*
    =========================
    PRIORITY
    =========================

    Deal Value 40%
    Stage      30%
    Activity   30%
  */

  let priority =
    Math.round(
      (valueScore * 0.40) +
      (currentStageScore * 0.30) +
      (activityScore * 0.30)
    )


  /*
    WON / LOST NICHT MEHR
    ALS AKTIVE PRIORITÄTEN
  */

  if (lead.status === "won") {
    priority = 0
  }

  if (lead.status === "lost") {
    priority = 0
  }


  /*
    =========================
    FINAL LIMITS
    =========================
  */

  return {
    priority:
      Math.max(
        0,
        Math.min(priority, 100)
      ),

    health:
      Math.max(
        0,
        Math.min(health, 100)
      ),

    activity:
      activityScore,

    engagement:
      engagement,

    risk:
      risk,

    probability:
      Math.max(
        0,
        Math.min(probability, 100)
      ),
  }
}
