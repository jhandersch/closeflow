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
    <section className="cf-card cf-enter p-6" aria-labelledby="activity-feed-heading">
      <div className="flex items-center justify-between">
        <div>
          <p className="cf-label">Recent activity</p>
          <h2 id="activity-feed-heading" className="cf-title text-lg font-semibold text-foreground">Latest momentum</h2>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <div key={activity.id} className="cf-card-soft p-3">
              <p className="text-sm text-foreground/80">{activity.action}</p>
              <p className="mt-1 text-xs text-foreground/55">{new Date(activity.created_at).toLocaleString()}</p>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-border-subtle bg-surface-2/60 p-4 text-sm text-foreground/55">
            No recent activity yet. Create a lead or load demo data to see momentum here.
          </div>
        )}
      </div>
    </section>
  )
}

