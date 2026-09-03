"use client";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
type Props = {
    pipelineValue: number;
    weightedRevenue: number;
    revenueAtRisk: number;
    commitRevenue: number;
    bestCaseRevenue: number;
    confidence: number;
    averageHealth: number;
    averageProbability: number;
    activeDeals: number;
    singleDealRisk: number;
    dealsWithNextAction: number;
    dealsWithoutNextAction: number;
    nextActionCoverage: number;
};
export default function RevenueForecast({ pipelineValue, weightedRevenue, revenueAtRisk, commitRevenue, bestCaseRevenue, confidence, averageHealth, averageProbability, activeDeals, singleDealRisk, dealsWithNextAction, dealsWithoutNextAction, nextActionCoverage, }: Props) {
    const { language } = useAppPreferences();
    const locale = "en-US";
    return (<section className="
        rounded-2xl
        border
        border-border-subtle
        bg-surface-1
        p-6
      ">
      <div className="
          flex
          flex-col
          gap-4
          md:flex-row
          md:items-center
          md:justify-between
        ">
        <div>
          <p className="
              text-sm
              uppercase
              tracking-widest
              text-cyan-400
            ">
            Revenue Intelligence
          </p>

          <h2 className="
              mt-2
              text-2xl
              font-bold
              text-foreground
            ">
            Sales Forecast
          </h2>

          <p className="
              mt-1
              text-sm
              text-foreground/60
            ">
            {"AI-powered forecast based on pipeline health, activity and deal probability."}
          </p>
        </div>

        <div className="
            rounded-full
            border
            border-emerald-500/20
            bg-emerald-500/10
            px-4
            py-2
            text-sm
            font-semibold
            text-emerald-300
          ">
          {confidence}%{" "}
          {"confidence"}
        </div>
      </div>

      {/* REVENUE METRICS */}

      <div className="
          mt-6
          grid
          gap-4
          md:grid-cols-5
        ">
        <Metric label={"Pipeline"} value={formatMoney(pipelineValue, locale)}/>

        <Metric label="Commit" value={formatMoney(commitRevenue, locale)} highlight/>

        <Metric label="Best Case" value={formatMoney(bestCaseRevenue, locale)}/>

        <Metric label={"Expected"} value={formatMoney(weightedRevenue, locale)} highlight/>

        <Metric label={"At Risk"} value={formatMoney(revenueAtRisk, locale)} danger/>
      </div>

      {/* INTELLIGENCE METRICS */}

    <div className="
        mt-6
        grid
        gap-4
        md:grid-cols-2
        xl:grid-cols-3
      ">
      <InsightCard title={"Pipeline Health"} value={`${averageHealth}%`} subtitle={"Average health of active deals"}/>

      <InsightCard title={"Close Probability"} value={`${averageProbability}%`} subtitle={"Average active-deal probability"}/>

      <InsightCard title={"Active Deals"} value={String(activeDeals)} subtitle={"Open opportunities"}/>

      <InsightCard title={"Deal Concentration"} value={`${singleDealRisk}%`} subtitle={singleDealRisk > 50
            ?
                "High concentration risk"
            : singleDealRisk >= 30
                ?
                    "Watch concentration"
                :
                    "Healthy distribution"} risk={singleDealRisk}/>

      <InsightCard title={"Next Action Coverage"} value={`${nextActionCoverage}%`} subtitle={`${dealsWithNextAction} of ${activeDeals} active deals have a next action`} risk={100 - nextActionCoverage}/>

      <InsightCard title={"Without Next Action"} value={String(dealsWithoutNextAction)} subtitle={"Active deals needing follow-up"} risk={activeDeals > 0
            ? Math.round((dealsWithoutNextAction /
                activeDeals) *
                100)
            : 0}/>
    </div>
    </section>);
}
function Metric({ label, value, highlight, danger, }: {
    label: string;
    value: string;
    highlight?: boolean;
    danger?: boolean;
}) {
    return (<div className={`
        rounded-xl
        bg-surface-2/70
        p-4
        ${danger
            ? "border border-red-500/20"
            : ""}
      `}>
      <p className="
          text-sm
          text-foreground/55
        ">
        {label}
      </p>

      <p className={`
          mt-2
          text-2xl
          font-bold
          ${highlight
            ? "text-emerald-400"
            : danger
                ? "text-red-400"
                : "text-foreground"}
        `}>
        {value}
      </p>
    </div>);
}
function InsightCard({ title, value, subtitle, risk, }: {
    title: string;
    value: string;
    subtitle?: string;
    risk?: number;
}) {
    const riskClass = typeof risk === "number"
        ? risk >= 60
            ? "text-red-400"
            : risk >= 40
                ? "text-amber-400"
                : "text-emerald-400"
        : "text-foreground";
    return (<div className="
        rounded-xl
        border
        border-border-subtle
        bg-surface-2/50
        p-4
      ">
      <p className="
          text-sm
          text-foreground/55
        ">
        {title}
      </p>

      <p className={`
          mt-2
          text-3xl
          font-bold
          ${typeof risk === "number"
            ? riskClass
            : "text-foreground"}
        `}>
        {value}
      </p>

      {subtitle && (<p className="
            mt-1
            text-xs
            text-foreground/45
          ">
          {subtitle}
        </p>)}
    </div>);
}
function formatMoney(value: number, locale: string) {
    return ("€" +
        Math.round(value).toLocaleString(locale));
}
