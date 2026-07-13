"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, LogOut, Settings2, Users, Workflow, Bot, UserRound } from "lucide-react"
import { useAppPreferences } from "@/components/AppPreferencesProvider"
import { supabase } from "@/lib/supabase/client"

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useAppPreferences()

  const links = [
    { href: "/dashboard", label: t("nav.dashboard", "Dashboard"), icon: LayoutDashboard },
    { href: "/leads", label: t("nav.leads", "Leads"), icon: Users },
    { href: "/pipeline", label: t("nav.pipeline", "Pipeline"), icon: Workflow },
    { href: "/customers", label: t("nav.customers", "Customers"), icon: UserRound },
    { href: "/ai", label: t("nav.ai", "AI Assistant"), icon: Bot },
    { href: "/teams", label: t("nav.teams", "Teams"), icon: Users },
    { href: "/settings", label: t("nav.settings", "Settings"), icon: Settings2 },
  ]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <aside className="sticky top-0 flex h-screen w-64 flex-col overflow-y-auto border-r border-border-subtle bg-gradient-to-b from-surface-1 to-surface-2 px-5 py-6 shadow-[inset_-1px_0_0_color-mix(in_oklab,var(--foreground)_8%,transparent)]">
      <div>
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 text-sm font-semibold text-cyan-200">
            CF
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight text-foreground">{t("brand.name", "CloseFlow")}</p>
            <p className="text-[10px] uppercase tracking-[0.28em] text-foreground/55">{t("brand.tagline", "Revenue OS")}</p>
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
                    ? "border border-cyan-500/30 bg-cyan-500/10 text-cyan-100 shadow-[0_0_0_1px_rgba(56,189,248,0.12)]"
                    : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
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
        className="mt-auto flex items-center gap-3 rounded-2xl border border-border-subtle bg-surface-2/70 px-4 py-3 text-left text-sm text-foreground/70 transition hover:bg-foreground/5 hover:text-foreground"
      >
        <LogOut size={18} />
        {t("nav.logout", "Logout")}
      </button>
    </aside>
  )
}