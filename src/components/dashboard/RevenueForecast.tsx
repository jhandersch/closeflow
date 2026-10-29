"use client";
import { formatEuro, getIntlLocale, translateText  } from "@/lib/i18n";
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

export default function RevenueForecast({
  pipelineValue,
  weightedRevenue,
  revenueAtRisk,
  commitRevenue,
  bestCaseRevenue,
  confidence,
  averageHealth,
  averageProbability,
  activeDeals,
  singleDealRisk,
  dealsWithNextAction,
  dealsWithoutNextAction,
  nextActionCoverage,
}: Props) {
  const locale = getIntlLocale();
  const { language } = useAppPreferences();

  return (
    <section
      className="
        rounded-2xl
        border
        border-border-subtle
        bg-surface-1
        p-6
      "
    >
      <div
        className="
          flex
          flex-col
          gap-4
          md:flex-row
          md:items-center
          md:justify-between
        "
      >
        <div>
          <p
            className="
              text-sm
              uppercase
              tracking-widest
              text-cyan-400
            "
          >
            {translateText("Revenue Intelligence")}</p>

          <h2
            className="
              mt-2
              text-2xl
              font-bold
              text-foreground
            "
          >
            {translateText("Sales Forecast")}</h2>

          <p
            className="
              mt-1
              text-sm
              text-foreground/60
            "
          >
            {translateText("AI-powered forecast based on pipeline health, activity and deal probability.")}</p>
          <p className="mt-1 text-xs text-foreground/50">
            {translateText("Forecast values are adjusted by your saved costs for each open deal.")}</p>
          <p className="mt-1 text-xs text-foreground/50">
            {translateText("Forecast confidence measures estimate reliability; close probability is separate for each deal.")}</p>
        </div>

        <div
          className="
            rounded-full
            border
            border-emerald-500/20
            bg-emerald-500/10
            px-4
            py-2
            text-sm
            font-semibold
            text-emerald-300
          "
        >
          {confidence}{translateText("% confidence")}</div>
      </div>

      <div
        className="
          mt-6
          grid
          gap-4
          md:grid-cols-5
        "
      >
        <Metric
          label="Pipeline"
          value={formatMoney(pipelineValue, locale)}
        />

        <Metric
          label="Commit"
          value={formatMoney(commitRevenue, locale)}
          highlight
        />

        <Metric
          label="Best Case"
          value={formatMoney(bestCaseRevenue, locale)}
        />

        <Metric
          label="Expected"
          value={formatMoney(weightedRevenue, locale)}
          highlight
        />

        <Metric
          label="At Risk"
          value={formatMoney(revenueAtRisk, locale)}
          danger
        />
      </div>

      <div
        className="
          mt-6
          grid
          gap-4
          md:grid-cols-2
          xl:grid-cols-3
        "
      >
        <InsightCard
          title={translateText("Pipeline Health")}
          value={`${averageHealth}%`}
          subtitle={translateText("Average health of active deals")}
        />

        <InsightCard
          title={translateText("Close Probability")}
          value={`${averageProbability}%`}
          subtitle={translateText("Average active-deal probability")}
        />

        <InsightCard
          title={translateText("Active Deals")}
          value={String(activeDeals)}
          subtitle={translateText("Open opportunities")}
        />

        <InsightCard
          title={translateText("Deal Concentration")}
          value={`${singleDealRisk}%`}
          subtitle={
            singleDealRisk > 50
              ? translateText("High concentration risk")
              : singleDealRisk >= 30
                ? translateText("Watch concentration")
                : translateText("Healthy distribution")
          }
          risk={singleDealRisk}
        />

        <InsightCard
          title={translateText("Next Action Coverage")}
          value={`${nextActionCoverage}%`}
          subtitle={language === "de"
            ? `${dealsWithNextAction} von ${activeDeals} aktiven Abschlüssen haben eine nächste Maßnahme`
            : `${dealsWithNextAction} of ${activeDeals} active deals have a next action`}
          risk={100 - nextActionCoverage}
        />

        <InsightCard
          title={translateText("Without Next Action")}
          value={String(dealsWithoutNextAction)}
          subtitle={translateText("Active deals needing follow-up")}
          risk={
            activeDeals > 0
              ? Math.round(
                  (dealsWithoutNextAction / activeDeals) * 100
                )
              : 0
          }
        />
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  highlight,
  danger,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={`
        rounded-xl
        bg-surface-2/70
        p-4
        ${danger ? "border border-red-500/20" : ""}
      `}
    >
      <p className="text-sm text-foreground/55">
        {translateText(label)}
      </p>

      <p
        className={`
          mt-2
          text-2xl
          font-bold
          ${
            highlight
              ? "text-emerald-400"
              : danger
                ? "text-red-400"
                : "text-foreground"
          }
        `}
      >
        {value}
      </p>
    </div>
  );
}

function InsightCard({
  title,
  value,
  subtitle,
  risk,
}: {
  title: string;
  value: string;
  subtitle?: string;
  risk?: number;
}) {
  const riskClass =
    typeof risk === "number"
      ? risk >= 60
        ? "text-red-400"
        : risk >= 40
          ? "text-amber-400"
          : "text-emerald-400"
      : "text-foreground";

  return (
    <div
      className="
        rounded-xl
        border
        border-border-subtle
        bg-surface-2/50
        p-4
      "
    >
      <p className="text-sm text-foreground/55">
        {title}
      </p>

      <p
        className={`
          mt-2
          text-3xl
          font-bold
          ${
            typeof risk === "number"
              ? riskClass
              : "text-foreground"
          }
        `}
      >
        {value}
      </p>

      {subtitle ? (
        <p className="mt-1 text-xs text-foreground/45">
          {translateText(subtitle)}
        </p>
      ) : null}
    </div>
  );
}

function formatMoney(
  value: number,
  locale: string
) {
  return formatEuro(Math.round(value), locale === "de-DE" ? "de" : "en");
}
