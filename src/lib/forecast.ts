import { calculateSalesScore } from "@/lib/salesScore";
import { getStaleDays } from "@/lib/scoring";
import type { Lead } from "@/types/lead";

const DEFAULT_TIMEZONE = "Europe/Berlin";

const getMonthKey = (value: string | Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(value));

  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";

  return `${year}-${month}`;
};

const formatMonthLabel = (monthKey: string, timeZone: string) => {
  const [year, month] = monthKey.split("-");

  const date = new Date(
    Date.UTC(Number(year), Number(month) - 1, 1, 12, 0, 0)
  );

  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    year: "2-digit",
  }).format(date);
};

export function calculateForecast(
  leads: Lead[],
  timeZone = DEFAULT_TIMEZONE,
  personalCostsByLead: Record<string, number> = {},
) {
  let pipelineValue = 0;
  let weightedRevenue = 0;
  let revenueAtRisk = 0;
  let commitRevenue = 0;
  let bestCaseRevenue = 0;
  let wonRevenue = 0;
  let lostRevenue = 0;
  let totalHealth = 0;
  let totalProbability = 0;
  let activeDeals = 0;
  let dealsWithNextAction = 0;
  let dealsWithoutNextAction = 0;

  const monthlyMap = new Map<string, number>();
  const scenarioBuckets = Array.from({ length: 6 }, () => ({ conservative: 0, expected: 0, optimistic: 0 }));
  const now = new Date();
  const currentMonth = getMonthKey(now, timeZone);
  const [currentYear, currentMonthNumber] = currentMonth.split("-").map(Number);
  const scenarioMonths = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(currentYear, currentMonthNumber - 1 + index, 15, 12));
    const monthKey = getMonthKey(date, timeZone);
    return { monthKey, month: formatMonthLabel(monthKey, timeZone) };
  });

  for (const lead of leads) {
    const grossValue = Number(lead.value || 0);
    const personalCosts = Math.max(0, Number(personalCostsByLead[lead.id] || 0));
    const value = grossValue - personalCosts;

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
      wonRevenue += value;
      continue;
    }

    if (lead.status === "lost") {
      lostRevenue += value;
      continue;
    }

    /*
     * =========================
     * ACTIVE DEAL
     * =========================
     */
    activeDeals++;

    if (lead.next_action?.trim()) {
      dealsWithNextAction++;
    } else {
      dealsWithoutNextAction++;
    }

    /*
     * =========================
     * SALES SCORE
     * =========================
     */
    const staleDays = getStaleDays(lead);
    const score = calculateSalesScore(lead, staleDays);

    /*
     * =========================
     * ACTIVE PIPELINE
     * =========================
     */
    pipelineValue += value;

    /*
     * =========================
     * WEIGHTED REVENUE
     * =========================
     */
    const probability = Math.max(
      0,
      Math.min(100, Number(score.probability || 0))
    );

    const weighted = value * (probability / 100);

    weightedRevenue += weighted;

    /*
     * =========================
     * HEALTH / PROBABILITY
     * =========================
     */
    totalHealth += score.health;
    totalProbability += probability;

    /*
     * =========================
     * COMMIT
     * =========================
     *
     * High probability + low risk.
     */
    if (probability >= 75 && score.risk < 50) {
      commitRevenue += value;
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
      bestCaseRevenue += value;
    }

    /*
     * =========================
     * AT RISK
     * =========================
     */
    if (score.risk >= 60) {
      revenueAtRisk += value;
    }

    /*
     * =========================
     * MONTHLY FORECAST
     * =========================
     *
     * expected_close_at and created_at
     * are stored as UTC timestamps.
     * The month bucket is determined in
     * the user's configured time zone.
     */
    const sourceDate = lead.expected_close_at || lead.created_at;

    if (sourceDate) {
      const date = new Date(sourceDate);

      if (!Number.isNaN(date.getTime())) {
        const monthKey = getMonthKey(date, timeZone);

        monthlyMap.set(
          monthKey,
          (monthlyMap.get(monthKey) || 0) + weighted
        );
      }
    }

    let scenarioMonthKey: string;
    const expectedCloseDate = lead.expected_close_at ? new Date(lead.expected_close_at) : null;
    if (expectedCloseDate && !Number.isNaN(expectedCloseDate.getTime()) && expectedCloseDate >= now) {
      scenarioMonthKey = getMonthKey(expectedCloseDate, timeZone);
    } else {
      const estimatedOffset = lead.status === "proposal" ? 1 : lead.status === "contacted" ? 2 : 4;
      const estimatedDate = new Date(Date.UTC(currentYear, currentMonthNumber - 1 + estimatedOffset, 15, 12));
      scenarioMonthKey = getMonthKey(estimatedDate, timeZone);
    }

    const scenarioIndex = scenarioMonths.findIndex((item) => item.monthKey === scenarioMonthKey);
    if (scenarioIndex >= 0) {
      const uncertainty = score.risk >= 60 ? 25 : score.risk >= 40 ? 15 : 10;
      scenarioBuckets[scenarioIndex].conservative += value * (Math.max(0, probability - uncertainty) / 100);
      scenarioBuckets[scenarioIndex].expected += weighted;
      scenarioBuckets[scenarioIndex].optimistic += value * (Math.min(100, probability + uncertainty) / 100);
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
      ? Math.round(totalHealth / activeDeals)
      : 0;

  const averageProbability =
    activeDeals > 0
      ? Math.round(totalProbability / activeDeals)
      : 0;

  const nextActionCoverage =
    activeDeals > 0
      ? Math.round((dealsWithNextAction / activeDeals) * 100)
      : 0;

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
      ? Math.round((weightedRevenue / pipelineValue) * 100)
      : 0;

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
    .map((lead) => Number(lead.value || 0) - Math.max(0, Number(personalCostsByLead[lead.id] || 0)));

  const largestActiveDeal =
    activeDealValues.length > 0
      ? Math.max(...activeDealValues)
      : 0;

  const singleDealRisk =
    pipelineValue > 0
      ? Math.round(
          (largestActiveDeal / pipelineValue) * 100
        )
      : 0;

  let cumulativeConservative = 0;
  let cumulativeExpected = 0;
  let cumulativeOptimistic = 0;
  const scenarioForecast = scenarioMonths.map((item, index) => {
    cumulativeConservative += scenarioBuckets[index].conservative;
    cumulativeExpected += scenarioBuckets[index].expected;
    cumulativeOptimistic += scenarioBuckets[index].optimistic;
    return {
      month: item.month,
      conservative: Math.round(cumulativeConservative),
      expected: Math.round(cumulativeExpected),
      optimistic: Math.round(cumulativeOptimistic),
    };
  });

  /*
   * =========================
   * RESULT
   * =========================
   */
  return {
    pipelineValue,
    weightedRevenue,
    revenueAtRisk,
    commitRevenue,
    bestCaseRevenue,
    wonRevenue,
    lostRevenue,
    confidence,
    averageHealth,
    averageProbability,
    activeDeals,
    singleDealRisk,
    dealsWithNextAction,
    dealsWithoutNextAction,
    nextActionCoverage,

    monthlyForecast: Array.from(monthlyMap.entries())
      .sort(([monthA], [monthB]) =>
        monthA.localeCompare(monthB)
      )
      .map(([month, value]) => ({
        month: formatMonthLabel(month, timeZone),
        value,
      })),
    scenarioForecast,
  };
}
