"use client";

type TaskCalendarProps = {
    tasks: Array<{
        id: string;
        title: string;
        due_date: string | null;
    }>;
    timeZone: string;
};

const formatDateOnly = (
    dateValue: string,
    locale: string,
) => {
    const match =
        /^(\d{4})-(\d{2})-(\d{2})/.exec(dateValue);

    if (!match) {
        return dateValue;
    }

    const [, year, month, day] = match;

    return new Intl.DateTimeFormat(locale, {
        timeZone: "UTC",
        year: "numeric",
        month: "long",
        day: "numeric",
    }).format(
        new Date(
            Date.UTC(
                Number(year),
                Number(month) - 1,
                Number(day),
            ),
        ),
    );
};

export default function TaskCalendar({
    tasks,
    timeZone,
}: TaskCalendarProps) {
    const locale = "en-US";

    return (
        <section className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
            <h2 className="text-lg font-semibold text-foreground">
                Calendar view
            </h2>

            <div className="mt-4 space-y-2">
                {tasks.length === 0 ? (
                    <p className="text-sm text-foreground/55">
                        No scheduled tasks.
                    </p>
                ) : (
                    tasks.map((task) => (
                        <div
                            key={task.id}
                            className="rounded-xl border border-border-subtle bg-surface-2/70 p-4 text-sm text-foreground/80"
                        >
                            <p className="font-medium text-foreground">
                                {task.title}
                            </p>

                            <p className="mt-1 text-xs text-foreground/55">
                                {task.due_date
                                    ? formatDateOnly(
                                          task.due_date,
                                          locale,
                                      )
                                    : "No due date"}
                            </p>

                            <p className="mt-1 text-[11px] text-foreground/35">
                                {timeZone}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </section>
    );
}