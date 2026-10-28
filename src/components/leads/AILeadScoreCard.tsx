import { translateText } from "@/lib/i18n";
type Props = {
    score: number;
    confidence: number;
    reason: string;
};
export default function AILeadScoreCard({ score, confidence, reason }: Props) {
    return (<section className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
      <p className="text-xs uppercase tracking-widest text-cyan-400">{translateText("AI Score")}</p>
      <h3 className="mt-2 text-2xl font-bold text-foreground">{score}/100</h3>
      <p className="mt-2 text-sm text-foreground/65">{translateText("Analysis confidence:")}{" "}{confidence}%</p>
      <p className="mt-1 text-xs text-foreground/50">
        {translateText("Confidence in this score, not the lead's win probability.")}</p>
      <p className="mt-3 text-sm leading-7 text-foreground/80">{reason}</p>
    </section>);
}
