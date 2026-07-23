export type DashboardInsight = {
  headline: string
  detail: string
  actions: string[]
  confidence: "High" | "Medium" | "Low"
}

type InsightInput = {
  leads: Array<{
    status: string
    value: number
    notes?: string | null
  }>
  revenue: number
  forecast: number
  proposalLeads: number
  atRiskDeals: number
  highValueDeals: number
}

export function generateDashboardInsight({
  leads,
  revenue,
  forecast,
  proposalLeads,
  atRiskDeals,
  highValueDeals,
}: InsightInput): DashboardInsight {
  const total = leads.length
  const upside = Math.max(0, Math.round(forecast - revenue))
  const highValue = highValueDeals > 0
  const hasRisk = atRiskDeals > 0
  const hasProposals = proposalLeads > 0

  if (total === 0) {
    return {
      headline: "Start by adding fresh leads.",
      detail: "No opportunities are queued yet, so the next step is to grow your pipeline.",
      actions: ["Add a few new leads to build momentum.", "Tag your next best opportunities with clear follow-up tasks."],
      confidence: "Medium",
    }
  }

  if (hasProposals && hasRisk) {
    return {
      headline: "A strong closing window is opening.",
      detail: `${proposalLeads} deals are in proposal stage and ${atRiskDeals} need immediate follow-up.`,
      actions: [
        `Book ${proposalLeads} follow-up calls this week.`,
        `Re-engage ${atRiskDeals} low-health opportunities before they stall.`,
        `Prioritize ${highValueDeals} high-value deals above €5k.`,
      ],
      confidence: "High",
    }
  }

  if (hasProposals) {
    return {
      headline: "Your pipeline is warming up.",
      detail: `You have ${proposalLeads} proposals ready to close, with ${upside}€ of upside versus current revenue.`,
      actions: [
        `Prepare closing messages for ${proposalLeads} active proposals.`,
        `Focus on ${highValueDeals} high-value opportunities.`,
      ],
      confidence: "Medium",
    }
  }

  if (hasRisk) {
    return {
      headline: "Several deals need attention.",
      detail: `${atRiskDeals} active opportunities show low health and may stall without intervention.`,
      actions: [
        `Inspect ${atRiskDeals} opportunities that need a health boost.`,
        `Keep nurturing the highest-value opportunities in your pipeline.`,
      ],
      confidence: "Medium",
    }
  }

  if (highValue) {
    return {
      headline: "High-value momentum is building.",
      detail: `Your pipeline includes ${highValueDeals} strong opportunities above €5k.`,
      actions: ["Prioritize strategic follow-up for premium accounts.", "Prepare tailored closing narratives for your largest deals."],
      confidence: "Medium",
    }
  }

  return {
    headline: "Momentum is steady.",
    detail: `Your current funnel is converting well and forecasted revenue sits ${upside}€ above closed revenue.`,
    actions: [
      `Inspect ${atRiskDeals} opportunities that need a health boost.`,
      `Keep nurturing the highest-value opportunities in your pipeline.`,
    ],
    confidence: "Medium",
  }
}
