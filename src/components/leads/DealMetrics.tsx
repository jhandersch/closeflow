"use client";
import { getIntlLocale, translateText  } from "@/lib/i18n";
import { useAppPreferences } from "@/components/AppPreferencesProvider";


type DealMetricsProps = {
  dealAge: number;
  priorityScore: number;
  healthScore: number;
  value: number;
  stageAge: number;
};

export default function DealMetrics({
  dealAge,
  priorityScore,
  healthScore,
  value,
  stageAge,
}: DealMetricsProps) {
  const { language } = useAppPreferences();
  const locale = getIntlLocale(language);

  return (
    <div className="rounded-xl bg-surface-1 p-6">
      <h2 className="mb-4 text-xl font-semibold">
        {translateText("Deal Information")}</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-border-subtle bg-surface-2/70 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/55">
            {translateText("Age")}</p>

          <p className="mt-3 text-sm text-foreground/55">
            {translateText("Deal Age")}</p>

          <p className="mt-1 text-2xl font-bold text-foreground">
            {dealAge} {translateText("days")}</p>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface-2/70 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/55">
            {translateText("Score")}</p>

          <p className="mt-3 text-sm text-foreground/55">
            {translateText("Priority")}</p>

          <p className="mt-1 text-2xl font-bold text-emerald-400">
            {priorityScore}/100
          </p>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface-2/70 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/55">
            {translateText("Health", language)}</p>

          <p className="mt-3 text-sm text-foreground/55">
            {translateText("Health", language)}</p>

          <p className="mt-1 text-2xl font-bold text-cyan-400">
            {healthScore}/100
          </p>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface-2/70 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/55">
            {translateText("Value")}</p>

          <p className="mt-3 text-sm text-foreground/55">
            {translateText("Deal Value")}</p>

          <p className="mt-1 text-2xl font-bold text-purple-400">
            €{value.toLocaleString(locale)}
          </p>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface-2/70 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/55">
            {translateText("Stage")}</p>

          <p className="mt-3 text-sm text-foreground/55">
            {translateText("Time in Stage")}</p>

          <p className="mt-1 text-2xl font-bold text-yellow-400">
            {stageAge} {translateText("days")}</p>
        </div>
      </div>
    </div>
  );
}
