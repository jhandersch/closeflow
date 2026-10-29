import { formatEuro, translateText  } from "@/lib/i18n";
type RevenueCardProps = {
    pipelineValue: number;
};
export default function RevenueCard({ pipelineValue }: RevenueCardProps) {
    return (<section className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
      <p className="text-sm uppercase tracking-widest text-cyan-400">{translateText("Pipeline")}</p>
      <h3 className="mt-2 text-sm text-foreground/60">{translateText("Pipeline")}</h3>
        <p className="mt-3 text-3xl font-semibold text-foreground">{formatEuro(pipelineValue)}</p>
    </section>);
}
