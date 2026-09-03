"use client";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
type Props = {
    analysis: {
        summary: string;
        positiveFactors: string[];
        risks: string[];
        recommendation: string;
    } | null;
    loading: boolean;
};
export default function AIForecastCard({ analysis, loading, }: Props) {
    const { t } = useAppPreferences();
    if (loading) {
        return (<div className="
        rounded-2xl
        border
        border-border-subtle
        bg-surface-1
        p-6
        animate-pulse
        ">

        <div className="h-5 w-48 rounded bg-white/10"/>

        <div className="
          mt-5
          h-4
          w-full
          rounded
          bg-white/10
        "/>

        <div className="
          mt-2
          h-4
          w-4/5
          rounded
          bg-white/10
        "/>

      </div>);
    }
    if (!analysis) {
        return (<div className="
        rounded-2xl
        border
        border-white/10
        bg-surface-1
        p-6
        ">

        <p className="text-sm text-foreground/60">
          {t("dashboard.aiForecastUnavailable", "AI forecast analysis is currently unavailable.")}
        </p>

      </div>);
    }
    return (<section className="
      rounded-2xl
      border
      border-cyan-500/20
      bg-gradient-to-br
      from-[#111]
      to-[#18181b]
      p-6
      ">


      <div className="flex items-center justify-between">


        <div>

          <p className="
            text-xs
            uppercase
            tracking-widest
            text-cyan-400
            ">
            {t("dashboard.aiForecastAnalyst", "AI Forecast Analyst")}
          </p>


          <h2 className="
            mt-2
            text-2xl
            font-bold
            text-foreground
            ">
            {t("dashboard.revenueIntelligence", "Revenue Intelligence")}
          </h2>

        </div>


        <div className="
          rounded-full
          border
          border-cyan-500/30
          bg-cyan-500/10
          px-3
          py-1
          text-xs
          font-semibold
          text-cyan-300
          ">
          {t("dashboard.aiActive", "AI ACTIVE")}
        </div>


      </div>





      <div className="
        mt-6
        rounded-xl
        bg-surface-2/70
        p-4
        ">

        <p className="
          leading-7
          text-foreground/80
        ">
          {analysis.summary}
        </p>

      </div>





      <div className="
        mt-6
        grid
        gap-4
        md:grid-cols-2
        ">

        <AISection title={t("dashboard.positiveFactors", "Positive Factors")} color="emerald" items={analysis.positiveFactors}/>


        <AISection title={t("dashboard.risks", "Risks")} color="red" items={analysis.risks}/>


      </div>





      <div className="
        mt-6
        rounded-xl
        border
        border-cyan-500/20
        bg-cyan-500/10
        p-4
        ">

        <p className="
          text-xs
          uppercase
          tracking-widest
          text-cyan-300
          ">
          {t("dashboard.aiRecommendation", "AI Recommendation")}
        </p>


        <p className="
          mt-2
          text-foreground
          ">
          {analysis.recommendation}
        </p>


      </div>


    </section>);
}
function AISection({ title, items, color, }: {
    title: string;
    items: string[];
    color: "emerald" | "red";
}) {
    return (<div className="
      rounded-xl
      bg-surface-2/70
      p-4
      ">

      <h3 className={color === "emerald"
            ? "font-semibold text-emerald-400"
            : "font-semibold text-red-400"}>
        {title}
      </h3>


      <ul className="mt-3 space-y-2">

        {items.map((item, index) => (<li key={index} className="
            text-sm
            text-foreground/80
            ">
            • {item}
          </li>))}

      </ul>


    </div>);
}
