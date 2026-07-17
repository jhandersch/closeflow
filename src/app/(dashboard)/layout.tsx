"use client"

import Sidebar from "@/components/Sidebar"
import Search from "@/components/Search"
import { SidebarProvider, useSidebar } from "@/components/SidebarContext"
import { Menu } from "lucide-react"

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { open, toggle, setOpen } = useSidebar()

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Mobile sidebar overlay backdrop */}
      {open ? (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <Sidebar />
      <Search />

      <main className="flex-1 overflow-x-hidden">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex items-center gap-4 border-b border-border-subtle bg-background/90 px-4 py-3 backdrop-blur-sm lg:hidden">
          <button
            onClick={toggle}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border-subtle text-foreground/70 transition hover:bg-foreground/5 hover:text-foreground"
          >
            <Menu size={18} />
          </button>
          <span className="text-sm font-semibold text-foreground">CloseFlow</span>
        </div>

        <div className="px-4 py-5 sm:px-7 lg:px-10 lg:py-8">
          <div className="mx-auto w-full max-w-[1320px]">{children}</div>
        </div>
      </main>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  )
}