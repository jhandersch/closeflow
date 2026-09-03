import { useAppPreferences } from "@/components/AppPreferencesProvider";
type ActivityFeedProps = {
    activities: Array<{
        id: string;
        title?: string | null;
        action?: string | null;
        created_at: string;
        type?: string;
    }>;
};
function getActivityStyle(type?: string) {
    switch (type) {
        case "created":
            return {
                icon: "➕",
                color: "text-emerald-300",
                bg: "bg-emerald-500/10",
                border: "border-emerald-500/20",
            };
        case "status_changed":
            return {
                icon: "🔄",
                color: "text-cyan-300",
                bg: "bg-cyan-500/10",
                border: "border-cyan-500/20",
            };
        case "ai":
            return {
                icon: "🤖",
                color: "text-purple-300",
                bg: "bg-purple-500/10",
                border: "border-purple-500/20",
            };
        case "meeting_created":
        case "meeting_updated":
        case "meeting_completed":
        case "meeting_deleted":
            return {
                icon: "📆",
                color: "text-blue-300",
                bg: "bg-blue-500/10",
                border: "border-blue-500/20",
            };
        case "follow_up":
            return {
                icon: "📅",
                color: "text-amber-300",
                bg: "bg-amber-500/10",
                border: "border-amber-500/20",
            };
        default:
            return {
                icon: "•",
                color: "text-foreground/70",
                bg: "bg-white/5",
                border: "border-border-subtle",
            };
    }
}
function getLocalizedActivityTitle(activity: {
    title?: string | null;
    action?: string | null;
    type?: string;
}) {
    const raw = (activity.title || activity.action || "").trim();
    const normalized = raw.toLowerCase();
    switch (activity.type) {
        case "meeting_created":
            return "Meeting created";
        case "meeting_updated":
            return "Meeting updated";
        case "meeting_completed":
            return "Meeting completed";
        case "meeting_deleted":
            return "Meeting deleted";
    }
    if (normalized === "meeting created") {
        return "Meeting created";
    }
    if (normalized === "meeting updated") {
        return "Meeting updated";
    }
    if (normalized === "meeting completed") {
        return "Meeting completed";
    }
    if (normalized === "meeting deleted") {
        return "Meeting deleted";
    }
    return raw || ("Activity");
}
export default function ActivityFeed({ activities, }: ActivityFeedProps) {
    const { language } = useAppPreferences();
    const locale = "en-US";
    return (<section className="
      cf-card
      cf-enter
      p-6
      ">


      <div className="flex items-center justify-between">


        <div>

          <p className="cf-label">
            {"Activity timeline"}
          </p>


          <h2 className="cf-title text-lg font-semibold text-foreground">
            {"Customer journey"}
          </h2>

        </div>


      </div>




      <div className="mt-5 space-y-3">


        {activities.length > 0 ? (activities.map((activity) => {
            const style = getActivityStyle(activity.type);
            return (<div key={activity.id} className="
                  flex
                  gap-4
                  rounded-xl
                  border
                  border-border-subtle
                  bg-surface-2/60
                  p-4
                  ">


                  <div className={`
                    flex
                    h-10
                    w-10
                    items-center
                    justify-center
                    rounded-full
                    border
                    ${style.border}
                    ${style.bg}
                    `}>

                    {style.icon}

                  </div>



                  <div className="flex-1">


                    <p className="
                    text-sm
                    font-medium
                    text-foreground
                    ">
                      {getLocalizedActivityTitle(activity)}
                    </p>



                    <p className="
                    mt-1
                    text-xs
                    text-foreground/55
                    ">
                      {new Date(activity.created_at).toLocaleString(locale, {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit"
                })}
                    </p>


                  </div>


                </div>);
        })) : (<div className="
              rounded-xl
              border
              border-dashed
              border-border-subtle
              bg-surface-2/60
              p-4
              text-sm
              text-foreground/55
              ">

              {"No activity yet. Create a lead to start tracking sales momentum."}

            </div>)}


      </div>


    </section>);
}
