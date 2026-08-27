import type { RevenueForecastInsight } from "@/types"

type Props = {
  insight: RevenueForecastInsight | null
  isDe?: boolean
  loading?: boolean
  error?: string | null
  
}

export default function RevenueForecastAI({
  insight,
  isDe = false,
  loading = false,
  error = null,
}: Props) {

  if (error) {
    return (
      <section className="rounded-3xl border border-border-subtle bg-surface-1 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border-subtle bg-surface-2 text-amber-300">
            AI
          </div>

          <div>
            <h3 className="font-semibold text-amber-200">
              AI request limit reached
            </h3>

            <p className="mt-1 text-sm text-amber-200/70">
              {error}
            </p>

            <p className="mt-3 text-sm text-foreground/60">
              The AI analysis will be available again when
              your monthly AI request limit resets or your
              workspace plan is upgraded.
            </p>
          </div>
        </div>
      </section>
    )
  }

  if (loading) {
    return (
      <section
        className="
          rounded-2xl
          border
          border-cyan-500/20
          bg-surface-1
          p-6
        "
      >
        <div className="animate-pulse">
          <div className="h-3 w-40 rounded bg-white/10" />
          <div className="mt-3 h-7 w-72 rounded bg-white/10" />

          <div className="mt-6 rounded-xl bg-surface-2/60 p-4">
            <div className="h-4 w-full rounded bg-white/10" />
            <div className="mt-2 h-4 w-5/6 rounded bg-white/10" />
            <div className="mt-2 h-4 w-2/3 rounded bg-white/10" />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <div className="h-5 w-32 rounded bg-white/10" />
              <div className="mt-3 h-10 rounded bg-white/10" />
            </div>

            <div>
              <div className="h-5 w-20 rounded bg-white/10" />
              <div className="mt-3 h-10 rounded bg-white/10" />
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (!insight) {
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
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-400">
          AI Revenue Intelligence
        </p>

        <h2 className="mt-2 text-xl font-semibold text-foreground">
          {isDe
            ? "Forecast wird analysiert"
            : "Forecast is being analyzed"}
        </h2>

        <p className="mt-2 text-sm text-foreground/60">
          {isDe
            ? "Die KI-Analyse wird vorbereitet."
            : "The AI analysis is being prepared."}
        </p>
      </section>
    )
  }

  const confidence = Math.round(insight.confidence)

  const healthColor =
    insight.health === "Excellent"
      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
      : insight.health === "Healthy"
        ? "text-green-400 bg-green-500/10 border-green-500/20"
        : insight.health === "Warning"
          ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
          : "text-red-400 bg-red-500/10 border-red-500/20"

  const healthLabel =
    isDe
      ? {
          Excellent: "Ausgezeichnet",
          Healthy: "Gesund",
          Warning: "Warnung",
          Critical: "Kritisch",
        }[insight.health]
      : insight.health

  return (
    <section
      className="
        rounded-2xl
        border
        border-cyan-500/20
        bg-surface-1
        p-6
      "
    >
      {/* HEADER */}

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
              text-xs
              uppercase
              tracking-[0.2em]
              text-cyan-400
            "
          >
            AI Revenue Intelligence
          </p>

          <h2
            className="
              mt-2
              text-2xl
              font-bold
              text-foreground
            "
          >
            {insight.headline}
          </h2>
        </div>

        <div className="flex flex-wrap gap-3">
          <div
            className={`
              rounded-full
              border
              px-3
              py-1
              text-sm
              font-semibold
              ${healthColor}
            `}
          >
            {healthLabel}
          </div>

          <div
            className="
              rounded-full
              border
              border-cyan-500/20
              bg-cyan-500/10
              px-3
              py-1
              text-sm
              font-semibold
              text-cyan-300
            "
          >
            {confidence}%{" "}
            {isDe ? "Konfidenz" : "confidence"}
          </div>
        </div>
      </div>

      {/* SUMMARY */}

      <div
        className="
          mt-6
          rounded-xl
          bg-surface-2/60
          p-4
        "
      >
        <p
          className="
            text-sm
            leading-7
            text-foreground/80
          "
        >
          {insight.summary}
        </p>
      </div>

      {/* DRIVERS + RISKS */}

      <div
        className="
          mt-6
          grid
          gap-6
          lg:grid-cols-2
        "
      >
        <InsightList
          title={isDe ? "Umsatztreiber" : "Revenue Drivers"}
          items={insight.topDrivers}
          color="emerald"
          emptyText={isDe ? "Keine Treiber erkannt." : "No drivers detected."}
        />

        <InsightList
          title={isDe ? "Risiken" : "Risks"}
          items={insight.risks}
          color="amber"
          emptyText={isDe ? "Keine Risiken erkannt." : "No risks detected."}
        />
      </div>

      {/* PIPELINE COMMENT */}

      <div
        className="
          mt-6
          rounded-xl
          border
          border-cyan-500/20
          bg-cyan-500/10
          p-4
        "
      >
        <p className="text-sm font-semibold text-cyan-300">
          {isDe ? "Pipeline-Analyse" : "Pipeline Analysis"}
        </p>

        <p
          className="
            mt-2
            text-sm
            leading-7
            text-foreground
          "
        >
          {insight.pipelineComment ||
            (isDe
              ? "Keine zusätzliche Pipeline-Bewertung verfügbar."
              : "No additional pipeline assessment available.")}
        </p>
      </div>

      {/* RECOMMENDATIONS */}

      <div
        className="
          mt-6
          rounded-xl
          border
          border-border-subtle
          bg-surface-2/60
          p-4
        "
      >
        <p className="text-sm font-semibold text-foreground">
          {isDe ? "Empfohlene Aktionen" : "Recommended Actions"}
        </p>

        <ul className="mt-3 space-y-2">
          {insight.recommendations.length > 0 ? (
            insight.recommendations.map((item, index) => (
              <li
                key={`${item}-${index}`}
                className="
                  rounded-lg
                  border
                  border-border-subtle
                  bg-surface-1
                  px-3
                  py-2
                  text-sm
                  text-foreground/80
                "
              >
                → {item}
              </li>
            ))
          ) : (
            <li className="text-sm text-foreground/60">
              {isDe
                ? "Keine Empfehlungen verfügbar."
                : "No recommendations available."}
            </li>
          )}
        </ul>
      </div>

      {/* DEAL CONCENTRATION */}

      <div
        className="
          mt-6
          text-sm
          text-foreground/60
        "
      >
        {isDe
          ? "Risiko durch Einzeldeal-Konzentration:"
          : "Single deal concentration risk:"}

        <span
          className="
            ml-2
            font-semibold
            text-foreground
          "
        >
          {Math.round(insight.singleDealRisk)}%
        </span>
      </div>
    </section>
  )
}

function InsightList({
  title,
  items,
  color,
  emptyText,
}: {
  title: string
  items: string[]
  color: "emerald" | "amber"
  emptyText: string
}) {
  const styles =
    color === "emerald"
      ? {
          title: "text-emerald-400",
          box: "border-emerald-500/10 bg-emerald-500/5",
        }
      : {
          title: "text-amber-400",
          box: "border-amber-500/10 bg-amber-500/5",
        }

  return (
    <div>
      <h3
        className={`
          font-semibold
          ${styles.title}
        `}
      >
        {title}
      </h3>

      <ul className="mt-3 space-y-2">
        {items.length > 0 ? (
          items.map((item, index) => (
            <li
              key={`${item}-${index}`}
              className={`
                rounded-lg
                border
                px-3
                py-2
                text-sm
                text-foreground/80
                ${styles.box}
              `}
            >
              {item}
            </li>
          ))
        ) : (
          <li
            className="
              rounded-lg
              border
              border-border-subtle
              bg-surface-2/60
              px-3
              py-2
              text-sm
              text-foreground/60
            "
          >
            {emptyText}
          </li>
        )}
      </ul>
    </div>
  )
}