"use client"

import Link from "next/link"
import { 
  ChevronRight,
  type LucideIcon
} from "lucide-react"

type SearchResultProps = {
  title: string
  subtitle?: string
  href: string
  icon: LucideIcon
  active?: boolean
  onClick?: () => void
}


export default function SearchResult({
  title,
  subtitle,
  href,
  icon: Icon,
  active = false,
  onClick,
}: SearchResultProps) {

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`
        flex items-center gap-3 rounded-xl px-3 py-3
        transition
        ${
          active
            ? "bg-cyan-500/10 border border-cyan-500/30"
            : "hover:bg-foreground/5"
        }
      `}
    >

      <div
        className="
          flex h-9 w-9 items-center justify-center
          rounded-xl
          border border-border-subtle
          bg-surface-2
          text-foreground/70
        "
      >
        <Icon size={17}/>
      </div>


      <div className="flex-1 min-w-0">

        <p
          className="
            truncate
            text-sm
            font-medium
            text-foreground
          "
        >
          {title}
        </p>


        {subtitle ? (
          <p
            className="
              truncate
              text-xs
              text-foreground/50
            "
          >
            {subtitle}
          </p>
        ) : null}

      </div>


      <ChevronRight
        size={16}
        className="
          text-foreground/30
        "
      />

    </Link>
  )
}