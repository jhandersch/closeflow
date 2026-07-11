"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/leads", label: "Leads" },
    { href: "/pipeline", label: "Pipeline" },
    { href: "/settings", label: "Settings" },
  ]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <div className="w-64 min-h-screen bg-[#111] border-r border-white/5 p-6 flex flex-col">
      <div>
        <h1 className="text-xl font-bold mb-10">
          CloseFlow
        </h1>

        <div className="space-y-2">
          {links.map((link) => {
            const active = pathname === link.href

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

      <button
        onClick={handleLogout}
        className="mt-auto px-4 py-2 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition text-left"
      >
        Logout
      </button>
    </div>
  )
}