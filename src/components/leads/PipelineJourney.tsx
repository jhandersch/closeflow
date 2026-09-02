"use client"

import { useAppPreferences } from "@/components/AppPreferencesProvider"

type PipelineJourneyProps = {
  status: string
}

const stages = ["new", "contacted", "proposal", "won", "lost"]

export default function PipelineJourney({
  status,
}: PipelineJourneyProps) {
  const { language } = useAppPreferences()
  const isDe = language === "de"
  const currentIndex = stages.indexOf(status)

  const labels: Record<string, string> = {
    new: isDe ? "Neu" : "New",
    contacted: isDe ? "Kontaktiert" : "Contacted",
    proposal: isDe ? "Angebot" : "Proposal",
    won: isDe ? "Gewonnen" : "Won",
    lost: isDe ? "Verloren" : "Lost",
  }

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          {isDe ? "Pipeline-Verlauf" : "Pipeline Journey"}
        </h2>

        <span className="font-semibold text-cyan-400">
          {status.toUpperCase()}
        </span>
      </div>

      <div className="flex items-center justify-between">
        {stages.map((stage, index) => {
          const completed = index <= currentIndex

          return (
            <div
              key={stage}
              className="flex flex-1 flex-col items-center"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full font-bold transition ${
                  completed
                    ? "bg-cyan-500 text-black"
                    : "bg-zinc-800 text-foreground/55"
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
                {labels[stage] ?? stage}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
