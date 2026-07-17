"use client"

import { useAppPreferences } from "@/components/AppPreferencesProvider"

type AICoachProps = {
  title: string
  message: string
  reasons: string[]
  action: string
  confidence: number
}

export default function AICoach({
  title,
  message,
  reasons,
  action,
  confidence,
}: AICoachProps) {
  const { language } = useAppPreferences()
  const isDe = language === "de"

  return (
    <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent p-6">

      <div className="flex items-start gap-4">

        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
          AI
        </div>

        <div className="flex-1">

          <p className="text-sm uppercase tracking-widest text-cyan-400">
            {isDe ? "KI-Coach" : "AI Coach"}
          </p>

          <h2 className="mt-2 text-2xl font-bold text-foreground">
            {title}
          </h2>

          <p className="mt-3 text-foreground/80">
            {message}
          </p>


          <div className="mt-4 space-y-2">

            {reasons.map((reason) => (
              <div
                key={reason}
                className="rounded-xl border border-border-subtle bg-surface-2/70 px-4 py-2 text-sm text-foreground/80"
              >
                {reason}
              </div>
            ))}

          </div>


          <div className="mt-5 flex items-center justify-between">

            <div>
              <p className="text-xs text-foreground/55">
                {isDe ? "Empfohlene Aktion" : "Recommended action"}
              </p>

              <p className="mt-1 font-semibold text-foreground">
                {action}
              </p>
            </div>


            <div className="rounded-full bg-green-500/20 px-4 py-2 text-sm font-semibold text-green-400">
              {confidence}% {isDe ? "Sicherheit" : "confidence"}
            </div>

          </div>

        </div>

      </div>

    </div>
  )
}
