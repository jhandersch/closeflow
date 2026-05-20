import Link from "next/link"
import {
  LayoutDashboard,
  Users,
  Kanban,
  Settings,
} from "lucide-react"

export default function Sidebar() {
  return (
    <aside className="w-64 border-r border-white/10 bg-zinc-950 p-6">
      <div className="mb-10">
        <h1 className="text-2xl font-bold">
          CloseFlow
        </h1>
      </div>

      <nav className="space-y-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-white/5 transition"
        >
          <LayoutDashboard size={20} />
          Dashboard
        </Link>

        <Link
          href="/dashboard/leads"
          className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-white/5 transition"
        >
          <Users size={20} />
          Leads
        </Link>

        <Link
          href="/dashboard/pipeline"
          className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-white/5 transition"
        >
          <Kanban size={20} />
          Pipeline
        </Link>

        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-white/5 transition"
        >
          <Settings size={20} />
          Settings
        </Link>
      </nav>
    </aside>
  )
}