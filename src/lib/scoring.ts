import type { Lead } from "@/types"

export function getStaleDays(lead: Lead) {
  const base = lead.stage_changed_at || lead.created_at
  const diff = Date.now() - new Date(base).getTime()

  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

export function getStaleScore(lead: Lead) {
  const days = getStaleDays(lead)

  if (days > 14) return 100
  if (days > 7) return 70
  if (days > 3) return 40

  return 10
}

export function getPriorityScore(lead: Lead) {
  let score = 10

  const stageBoost: Record<string, number> = {
    new: 10,
    contacted: 25,
    proposal: 35,
    won: 20,
  }

  score += stageBoost[lead.status] ?? 0

  const value = lead.value || 0

  if (value >= 10000) score += 25
  else if (value >= 5000) score += 15
  else if (value >= 1000) score += 8

  const staleDays = getStaleDays(lead)
  if (staleDays > 14) score -= 12
  else if (staleDays > 7) score -= 6
  else if (staleDays > 3) score -= 3

  const noteCount = lead.notes ? lead.notes.trim().length : 0
  if (noteCount > 80) score += 8
  else if (noteCount > 40) score += 4

  return Math.max(0, Math.min(Math.round(score), 100))
}

export function getHealthScore(lead: Lead) {
  let score = 100

  const stageAdjustment: Record<string, number> = {
    new: -20,
    contacted: -10,
    proposal: 15,
    won: 15,
  }

  score += stageAdjustment[lead.status] ?? 0

  const value = lead.value || 0
  if (value >= 10000) score += 15
  else if (value >= 5000) score += 8
  else if (value < 1000) score -= 8

  const stale = getStaleDays(lead)
  if (stale > 14) score -= 30
  else if (stale > 7) score -= 15
  else if (stale > 3) score -= 6

  const noteCount = lead.notes ? lead.notes.trim().length : 0
  if (noteCount > 80) score += 5
  else if (noteCount > 40) score += 2

  return Math.max(0, Math.min(Math.round(score), 100))
}

export function getCloseProbability(lead: Lead) {
  let probability = 20

  if (lead.status === "proposal") probability += 35
  else if (lead.status === "contacted") probability += 20
  else if (lead.status === "new") probability += 5
  else if (lead.status === "won") probability = 100

  if ((lead.value || 0) >= 10000) probability += 15
  else if ((lead.value || 0) >= 5000) probability += 10
  else if ((lead.value || 0) >= 1000) probability += 5

  const staleDays = getStaleDays(lead)
  if (staleDays > 14) probability -= 20
  else if (staleDays > 7) probability -= 10

  const noteCount = lead.notes ? lead.notes.trim().length : 0
  if (noteCount > 80) probability += 8
  else if (noteCount > 40) probability += 4

  return Math.max(0, Math.min(Math.round(probability), 100))
}

export type LeadAnalysis = {
  priority: number
  health: number
  urgency: "Low" | "Medium" | "High"
  reasons: string[]
  probability: number
}

export function analyzeLead(lead: Lead): LeadAnalysis {
  const priority = getPriorityScore(lead)
  const health = getHealthScore(lead)
  const probability = getCloseProbability(lead)

  const reasons: string[] = []

  if (lead.status === "proposal") reasons.push("Lead is in proposal stage.")
  if (lead.status === "contacted") reasons.push("Lead has been contacted but not progressed.")
  if (lead.status === "new") reasons.push("Lead still needs qualification.")
  if ((lead.value || 0) >= 10000) reasons.push("High-value opportunity.")
  else if ((lead.value || 0) >= 5000) reasons.push("Above-average deal value.")

  const stale = getStaleDays(lead)
  if (stale > 14) reasons.push(`No activity for ${stale} days.`)
  else if (stale > 7) reasons.push(`Lead has been inactive for ${stale} days.`)

  let urgency: "Low" | "Medium" | "High" = "Low"
  if (priority >= 80 || probability >= 80) urgency = "High"
  else if (priority >= 50 || probability >= 55) urgency = "Medium"

  return {
    priority,
    health,
    urgency,
    reasons,
    probability,
  }
}