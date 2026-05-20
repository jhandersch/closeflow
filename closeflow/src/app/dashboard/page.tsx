export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-6">
        Dashboard
      </h1>

      <div className="grid grid-cols-3 gap-6">
        <div className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
          <h2 className="text-zinc-400 mb-2">
            Total Leads
          </h2>

          <p className="text-3xl font-bold">
            124
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
          <h2 className="text-zinc-400 mb-2">
            Active Deals
          </h2>

          <p className="text-3xl font-bold">
            18
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
          <h2 className="text-zinc-400 mb-2">
            Revenue
          </h2>

          <p className="text-3xl font-bold">
            €12,400
          </p>
        </div>
      </div>
    </div>
  )
}