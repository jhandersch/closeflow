type Activity = {
  id: string
  action: string
  type?: string
  created_at: string
}

type ActivityTimelineProps = {
  activities: Activity[]
}

export default function ActivityTimeline({
  activities,
}: ActivityTimelineProps) {

  const getActivityIcon = (type?: string) => {
    switch (type) {
      case "status":
        return "🔄"

      case "note":
        return "📝"

      default:
        return "📌"
    }
  }


  return (
    <div className="rounded-xl bg-[#111] p-6">

      <h2 className="mb-4 text-xl font-semibold text-white">
        Activity Timeline
      </h2>


      {activities.length === 0 ? (

        <p className="text-zinc-500">
          No activities yet.
        </p>

      ) : (

        <div className="space-y-3">

          {activities.map((a) => (

            <div
              key={a.id}
              className="border-b border-white/10 pb-3"
            >

              <div className="flex items-center gap-3">

                <span className="text-xl">
                  {getActivityIcon(a.type)}
                </span>


                <div>

                  <p className="font-medium text-white">
                    {a.type === "ai"
                    ? "AI Assistant: " + a.action
                    : a.action}
                  </p>


                  <p className="text-xs text-zinc-500">
                    {a.type || "event"}
                  </p>


                  <p className="mt-1 text-xs text-zinc-500">
                    {new Date(
                      a.created_at
                    ).toLocaleString()}
                  </p>


                </div>

              </div>

            </div>

          ))}

        </div>

      )}

    </div>
  )
}