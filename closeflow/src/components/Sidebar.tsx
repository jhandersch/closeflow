"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export default function Sidebar() {
  const pathname = usePathname()

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/leads", label: "Leads" },
    { href: "/pipeline", label: "Pipeline" },
  ]

  return (
    <div className="w-64 min-h-screen bg-[#111] border-r border-white/5 p-6">
      <h1 className="text-xl font-bold mb-10">
        CloseFlow
      </h1>

      <div className="space-y-2">
        {links.map((link) => {
          const active =
            pathname === link.href

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`block px-4 py-2 rounded-xl transition ${
                active
                  ? "bg-white text-black"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {link.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}