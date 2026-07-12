"use client"

import Sidebar from "@/components/Sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-black text-white">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
    </div>
  )
}