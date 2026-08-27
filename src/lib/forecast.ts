import { calculateSalesScore } from "@/lib/salesScore"
import { getStaleDays } from "@/lib/scoring"
import type { Lead } from "@/types/lead"

export function calculateForecast(leads: Lead[]) {
  let pipelineValue = 0
  let weightedRevenue = 0
  let revenueAtRisk = 0

  let commitRevenue = 0
  let bestCaseRevenue = 0

  let wonRevenue = 0
  let lostRevenue = 0

  let totalHealth = 0
  let totalProbability = 0

  let activeDeals = 0

  let dealsWithNextAction = 0
  let dealsWithoutNextAction = 0

  const monthlyMap = new Map<string, number>()

  for (const lead of leads) {
    const value = Number(lead.value || 0)

    /*
     * =========================
     * CLOSED DEALS
     * =========================
     *
     * Won and lost deals are final.
     * They are excluded from the
     * active pipeline forecast.
     */

    if (lead.status === "won") {
      wonRevenue += value
      continue
    }

    if (lead.status === "lost") {
      lostRevenue += value
      continue
    }

    /*
     * =========================
     * ACTIVE DEAL
     * =========================
     */

    activeDeals++

    if (lead.next_action?.trim()) {
      dealsWithNextAction++
    } else {
      dealsWithoutNextAction++
    }

    /*
     * =========================
     * SALES SCORE
     * =========================
     */

    const staleDays = getStaleDays(lead)

    const score = calculateSalesScore(
      lead,
      staleDays
    )

    /*
     * =========================
     * ACTIVE PIPELINE
     * =========================
     */

    pipelineValue += value

    /*
     * =========================
     * WEIGHTED REVENUE
     * =========================
     */

    const probability =
      Math.max(
        0,
        Math.min(
          100,
          Number(score.probability || 0)
        )
      )

    const weighted =
      value *
      (probability / 100)

    weightedRevenue += weighted

    /*
     * =========================
     * HEALTH / PROBABILITY
     * =========================
     */

    totalHealth += score.health
    totalProbability += probability

    /*
     * =========================
     * COMMIT
     * =========================
     *
     * High probability + low risk.
     */

    if (
      probability >= 75 &&
      score.risk < 50
    ) {
      commitRevenue += value
    }

    /*
     * =========================
     * BEST CASE
     * =========================
     *
     * Medium/high probability
     * opportunities which are not
     * already classified as Commit.
     */

    else if (probability >= 45) {
      bestCaseRevenue += value
    }

    /*
     * =========================
     * AT RISK
     * =========================
     */

    if (score.risk >= 60) {
      revenueAtRisk += value
    }

    /*
     * =========================
     * MONTHLY FORECAST
     * =========================
     */

    const date = lead.expected_close_at
      ? new Date(lead.expected_close_at)
      : new Date(lead.created_at)

    /*
     * Ignore invalid dates instead of
     * creating an "Invalid Date" bucket.
     */

    if (!Number.isNaN(date.getTime())) {
      const month =
        date.toLocaleDateString(
          "en-US",
          {
            month: "short",
            year: "2-digit",
          }
        )

      monthlyMap.set(
        month,
        (monthlyMap.get(month) || 0) +
          weighted
      )
    }
  }

  /*
   * =========================
   * AVERAGES
   * =========================
   *
   * Only ACTIVE deals are included.
   */

  const averageHealth =
    activeDeals > 0
      ? Math.round(
          totalHealth / activeDeals
        )
      : 0

  const averageProbability =
    activeDeals > 0
      ? Math.round(
          totalProbability /
            activeDeals
        )
      : 0

  const nextActionCoverage =
  activeDeals > 0
    ? Math.round(
        (dealsWithNextAction / activeDeals) * 100
      )
    : 0

  /*
   * =========================
   * FORECAST CONFIDENCE
   * =========================
   *
   * This represents the weighted
   * probability of the active pipeline.
   */

  const confidence =
    pipelineValue > 0
      ? Math.round(
          (weightedRevenue /
            pipelineValue) *
            100
        )
      : 0

    /*
   * =========================
   * SINGLE DEAL CONCENTRATION
   * =========================
   */

  const activeDealValues = leads
    .filter(
      (lead) =>
        lead.status !== "won" &&
        lead.status !== "lost"
    )
    .map((lead) =>
      Number(lead.value || 0)
    )

  const largestActiveDeal =
    activeDealValues.length > 0
      ? Math.max(...activeDealValues)
      : 0

  const singleDealRisk =
    pipelineValue > 0
      ? Math.round(
          (largestActiveDeal /
            pipelineValue) *
            100
        )
      : 0

  /*
   * =========================
   * RESULT
   * =========================
   */

  return {
    /*
     * Active pipeline only
     */
    pipelineValue,

    /*
     * Probability-weighted active
     * pipeline revenue
     */
    weightedRevenue,

    /*
     * Active deals with high risk
     */
    revenueAtRisk,

    /*
     * High-confidence active deals
     */
    commitRevenue,

    /*
     * Medium/high-confidence active deals
     * excluding Commit
     */
    bestCaseRevenue,

    /*
     * Closed revenue
     */
    wonRevenue,

    /*
     * Lost revenue
     */
    lostRevenue,

    /*
     * Forecast confidence
     */
    confidence,

    /*
     * Average health of active deals
     */
    averageHealth,

    /*
     * Average probability of active deals
     */
    averageProbability,

    /*
     * Number of active deals
     */
    activeDeals,
    singleDealRisk,

    dealsWithNextAction,
    dealsWithoutNextAction,
    nextActionCoverage,

    monthlyForecast:
      Array.from(monthlyMap.entries())
        .sort(([monthA], [monthB]) => {
          const dateA = new Date(`1 ${monthA}`)
          const dateB = new Date(`1 ${monthB}`)

          return dateA.getTime() - dateB.getTime()
        })
        .map(
          ([month, value]) => ({
            month,
            value,
          })
        ),
  }
}