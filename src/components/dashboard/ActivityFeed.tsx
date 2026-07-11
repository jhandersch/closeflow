type ActivityFeedProps = {
  activities: Array<{
    id: string
    action: string
    created_at: string
    type?: string
  }>
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#111] p-6" aria-labelledby="activity-feed-heading">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-400">Recent activity</p>
          <h2 id="activity-feed-heading" className="text-lg font-semibold text-white">Latest momentum</h2>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <div key={activity.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
              <p className="text-sm text-zinc-300">{activity.action}</p>
              <p className="mt-1 text-xs text-zinc-500">{new Date(activity.created_at).toLocaleString()}</p>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-zinc-500">
            No recent activity yet. New lead actions will appear here automatically.
          </div>
        )}
      </div>
    </section>
  )
}
