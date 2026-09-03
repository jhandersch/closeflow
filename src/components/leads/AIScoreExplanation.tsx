type ScoreReason = {
    icon: string;
    text: string;
};
type AIScoreExplanationProps = {
    reasons: ScoreReason[];
};
export default function AIScoreExplanation({ reasons, }: AIScoreExplanationProps) {
    return (<div className="
      rounded-2xl
      border
      border-border-subtle
      bg-surface-1
      p-6
    ">

      <p className="
        text-sm
        uppercase
        tracking-widest
        text-cyan-400
      ">
        AI Score Explanation
      </p>


      <h2 className="
        mt-2
        text-2xl
        font-bold
        text-foreground
      ">
        Why this score?
      </h2>


      <div className="
        mt-4
        space-y-3
      ">

        {reasons.map((reason) => (<div key={reason.text} className="
              flex
              items-center
              gap-3
              rounded-xl
              border
              border-border-subtle
              bg-surface-2/70
              p-3
            ">

            <span className="text-xl">
              {reason.icon}
            </span>


            <p className="text-foreground/80">
              {reason.text}
            </p>


          </div>))}

      </div>


    </div>);
}
