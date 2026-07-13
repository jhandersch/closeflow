import type { ReactNode } from "react"

type EmptyStateProps = {
  icon?: ReactNode
  title: string
  description: string
  actions?: ReactNode
  compact?: boolean
}

export default function EmptyState({ icon, title, description, actions, compact = false }: EmptyStateProps) {
  return (
    <div className={`cf-card cf-enter rounded-3xl p-8 text-center ${compact ? "p-6" : "p-8"}`}>
      {icon ? <div className="flex justify-center text-4xl">{icon}</div> : null}
      <h3 className="cf-title mt-4 text-xl font-semibold text-foreground">{title}</h3>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-zinc-400">{description}</p>
      {actions ? <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div> : null}
    </div>
  )
}
