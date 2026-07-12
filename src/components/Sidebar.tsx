"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, LogOut, Settings2, Users, Workflow } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/leads", label: "Leads", icon: Users },
    { href: "/pipeline", label: "Pipeline", icon: Workflow },
    { href: "/settings", label: "Settings", icon: Settings2 },
  ]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <aside className="sticky top-0 flex h-screen w-64 flex-col overflow-y-auto border-r border-white/10 bg-[#111] px-5 py-6">
      <div>
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/15 text-sm font-semibold text-cyan-300">
            CF
          </div>
          <div>
            <p className="text-lg font-semibold text-white">CloseFlow</p>
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Revenue OS</p>
          </div>
        </div>

        <nav className="space-y-2">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`)
            const Icon = link.icon

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-white text-black shadow-sm"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={18} />
                {link.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <button
        onClick={() => void handleLogout()}
        className="mt-auto flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-left text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white"
      >
        <LogOut size={18} />
        Logout
      </button>
    </aside>
  )
}