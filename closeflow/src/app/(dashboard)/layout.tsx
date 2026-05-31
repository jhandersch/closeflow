import Sidebar from "@/components/Sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-black text-white">

      {/* ONLY PLACE SIDEBAR EXISTS */}
      <Sidebar />

      <main className="flex-1 p-10">
        {children}
      </main>

    </div>
  )
}