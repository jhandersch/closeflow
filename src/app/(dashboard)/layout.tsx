"use client"

import Sidebar from "@/components/Sidebar"
import Search from "@/components/Search"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <Search />
      <main className="flex-1 overflow-x-hidden px-4 py-6 sm:px-7 lg:px-10 lg:py-8">
        <div className="mx-auto w-full max-w-[1320px]">{children}</div>
      </main>
    </div>
  )
}