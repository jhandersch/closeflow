type RevenueCardProps = {
    pipelineValue: number;
};
export default function RevenueCard({ pipelineValue }: RevenueCardProps) {
    return (<section className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
      <p className="text-sm uppercase tracking-widest text-cyan-400">Pipeline</p>
      <h3 className="mt-2 text-sm text-foreground/60">Pipeline</h3>
      <p className="mt-3 text-3xl font-semibold text-foreground">€{pipelineValue.toLocaleString("en-US")}</p>
    </section>);
}
