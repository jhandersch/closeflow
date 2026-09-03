"use client";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
type TaskCalendarProps = {
    tasks: Array<{
        id: string;
        title: string;
        due_date: string | null;
    }>;
};
export default function TaskCalendar({ tasks }: TaskCalendarProps) {
    const { language } = useAppPreferences();
    return (<section className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
      <h2 className="text-lg font-semibold text-foreground">{"Calendar view"}</h2>
      <div className="mt-4 space-y-2">
        {tasks.length === 0 ? (<p className="text-sm text-foreground/55">{"No scheduled tasks."}</p>) : (tasks.map((task) => (<div key={task.id} className="rounded-xl border border-border-subtle bg-surface-2/70 p-4 text-sm text-foreground/80">
              <p className="font-medium text-foreground">{task.title}</p>
              <p className="mt-1 text-xs text-foreground/55">{task.due_date ? new Date(task.due_date).toLocaleDateString("en-US") : ("No due date")}</p>
            </div>)))}
      </div>
    </section>);
}
