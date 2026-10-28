"use client";
import { translateText } from "@/lib/i18n";


type PipelineJourneyProps = {
  status: string;
};

const stages = ["new", "contacted", "proposal", "won", "lost"];

export default function PipelineJourney({
  status,
}: PipelineJourneyProps) {
  const currentIndex = stages.indexOf(status);

  const labels: Record<string, string> = {
    new: "New",
    contacted: "Contacted",
    proposal: "Proposal",
    won: "Won",
    lost: "Lost",
  };

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          {translateText("Pipeline Journey")}</h2>

        <span className="font-semibold text-cyan-400">
          {translateText(labels[status] ?? status).toUpperCase()}
        </span>
      </div>

      <div className="flex items-center justify-between">
        {stages.map((stage, index) => {
          const completed = index <= currentIndex;

          return (
            <div
              key={stage}
              className="flex flex-1 flex-col items-center"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full font-bold transition ${
                  completed
                    ? "bg-accent text-accent-foreground"
                    : "bg-surface-2 text-foreground/55"
                }`}
              >
                {index + 1}
              </div>

              <p
                className={`mt-3 text-xs ${
                  completed
                    ? "text-cyan-400"
                    : "text-foreground/55"
                }`}
              >
                {translateText(labels[stage] ?? stage)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
