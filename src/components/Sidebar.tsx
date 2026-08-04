"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, LogOut, Settings2, Users, Workflow, Bot, BarChart3, CreditCard, ListTodo, UserRoundCheck, Activity, Sparkles, ShieldCheck, Search as SearchIcon, X, Calendar, MessageSquare } from "lucide-react"
import { useAppPreferences } from "@/components/AppPreferencesProvider"
import { useSidebar } from "@/components/SidebarContext"
import { supabase } from "@/lib/supabase/client"
import { usePermissions } from "@/hooks/usePermissions"

function useNotificationCount() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const response = await fetch("/api/notifications")
      if (!response.ok || cancelled) return

      const data = (await response.json()) as Array<{ level: string }>
      if (!cancelled) {
        setCount(Array.isArray(data) ? data.filter((n) => n.level === "critical" || n.level === "warning").length : 0)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [])

  return count
}

export default function Sidebar() {
  const {
    canManageWorkspace,
    canManageBilling,
    isPlatformAdmin,
  } = usePermissions()
  const pathname = usePathname()
  const router = useRouter()
  const { hydrated, t } = useAppPreferences()
  const { open, setOpen } = useSidebar()
  const notificationCount = useNotificationCount()

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setOpen(false)
  }, [pathname, setOpen])

  const links = [
    { href: "/search",      label: t("nav.search", "Suche"),           icon: SearchIcon },
    { href: "/dashboard",    label: t("nav.dashboard", "Dashboard"),    icon: LayoutDashboard },
    { href: "/leads",        label: t("nav.leads", "Leads"),            icon: Users },
    { href: "/customers",   label: t("nav.customers", "Kunden"),        icon: UserRoundCheck },
    { href: "/pipeline",    label: t("nav.pipeline", "Pipeline"),      icon: Workflow },
    { href: "/tasks",       label: t("nav.tasks", "Aufgaben"),         icon: ListTodo },
    { href: "/activities",  label: t("nav.activities", "Activities"),  icon: Activity },
    { href: "/ai",          label: t("nav.ai", "KI-Assistent"),        icon: Bot },
    { href: "/analytics",   label: t("nav.analytics", "Analytics"),    icon: BarChart3 },
    { href: "/forecast",    label: t("nav.forecast", "Forecast"),      icon: Sparkles },
    { href: "/calendar",    label: t("nav.calendar", "Calendar"),      icon: Calendar },
    { href: "/feedback",    label: t("nav.feedback", "Feedback"),      icon: MessageSquare },
    { href: "/automations", label: t("nav.automations", "Automatisierungen"), icon: Sparkles },
    { href: "/notifications", label: t("nav.notifications", "Benachrichtigungen"), icon: ListTodo },
    ...(canManageWorkspace
      ? [{ href: "/team", label: t("nav.team", "Team"), icon: Users }]
      : []),
    ...(canManageBilling
      ? [{ href: "/billing", label: t("nav.billing", "Abrechnung"), icon: CreditCard }]
      : []),
    ...(isPlatformAdmin
      ? [{ href: "/admin", label: t("nav.admin", "Admin"), icon: ShieldCheck }]
      : []),
    { href: "/settings",    label: t("nav.settings", "Einstellungen"), icon: Settings2 },
  ]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-border-subtle bg-gradient-to-b from-surface-1 to-surface-2 px-5 py-6 shadow-[inset_-1px_0_0_color-mix(in_oklab,var(--foreground)_8%,transparent)] lg:flex">
        <SidebarContent
          hydrated={hydrated}
          links={links}
          t={t}
          pathname={pathname}
          notificationCount={notificationCount}
          onLinkClick={() => undefined}
          onLogout={() => void handleLogout()}
        />
      </aside>

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-y-auto border-r border-border-subtle bg-gradient-to-b from-surface-1 to-surface-2 px-5 py-6 shadow-2xl transition-transform duration-200 lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/25 bg-cyan-500/10 text-sm font-semibold text-cyan-200">
              CF
            </div>
            <p className="text-base font-semibold tracking-tight text-foreground">{t("brand.name", "CloseFlow")}</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border-subtle text-foreground/60 transition hover:bg-foreground/5 hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>
        <SidebarContent
          hydrated={hydrated}
          links={links}
          t={t}
          pathname={pathname}
          notificationCount={notificationCount}
          onLinkClick={() => setOpen(false)}
          onLogout={() => void handleLogout()}
        />
      </aside>
    </>
  )
}

type LinkDef = {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number }>
}

function SidebarContent({
  hydrated,
  links,
  t,
  pathname,
  notificationCount,
  onLinkClick,
  onLogout,
}: {
  hydrated: boolean
  links: LinkDef[]
  t: (key: string, fallback: string) => string
  pathname: string
  notificationCount: number
  onLinkClick: () => void
  onLogout: () => void
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-8 hidden items-center gap-3 lg:flex">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 text-sm font-semibold text-cyan-200">
          CF
        </div>
        <div>
          <p className="text-lg font-semibold tracking-tight text-foreground">{hydrated ? t("brand.name", "CloseFlow") : "CloseFlow"}</p>
          <p className="text-[10px] uppercase tracking-[0.28em] text-foreground/55">{hydrated ? t("brand.tagline", "Revenue OS") : "Revenue OS"}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`)
          const Icon = link.icon
          const isNotifications = link.href === "/notifications"
          const isSearch = link.href === "/search"

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onLinkClick}
              className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
                active
                  ? "border border-cyan-500/30 bg-cyan-500/10 text-cyan-100 shadow-[0_0_0_1px_rgba(56,189,248,0.12)]"
                  : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
              }`}
            >
              <Icon size={17} />
              {hydrated ? (
                <span className="flex-1">{link.label}</span>
              ) : (
                <span className="flex-1">
                  <span className="block h-3 w-20 animate-pulse rounded-full bg-foreground/10" />
                </span>
              )}
              {isSearch ? (
                <span className="rounded-md border border-border-subtle px-1.5 py-0.5 text-[10px] text-foreground/55">
                  Ctrl+K
                </span>
              ) : null}
              {isNotifications && notificationCount > 0 ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500/80 px-1.5 text-[10px] font-semibold text-white">
                  {notificationCount > 99 ? "99+" : notificationCount}
                </span>
              ) : null}
            </Link>
          )
        })}
      </nav>

      <button
        onClick={onLogout}
        className="mt-4 flex items-center gap-3 rounded-2xl border border-border-subtle bg-surface-2/70 px-4 py-3 text-left text-sm text-foreground/70 transition hover:bg-foreground/5 hover:text-foreground"
      >
        <LogOut size={17} />
        {hydrated ? t("nav.logout", "Logout") : <span className="block h-3 w-16 animate-pulse rounded-full bg-foreground/10" />}
      </button>
    </div>
  )
}