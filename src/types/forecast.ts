export type RevenueForecastInsight = {
  confidence: number
  health:
    | "Excellent"
    | "Healthy"
    | "Warning"
    | "Critical"

  headline: string
  summary: string

  topDrivers: string[]
  risks: string[]
  recommendations: string[]

  pipelineComment: string

  singleDealRisk: number
}