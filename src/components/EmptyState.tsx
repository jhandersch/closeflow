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
    <div className={`rounded-3xl border border-white/10 bg-[#111] p-8 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.03)] ${compact ? "p-6" : "p-8"}`}>
      {icon ? <div className="flex justify-center text-4xl">{icon}</div> : null}
      <h3 className="mt-4 text-xl font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-zinc-400">{description}</p>
      {actions ? <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div> : null}
    </div>
  )
}
