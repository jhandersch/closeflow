import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase/client";

import type { Task, TaskPriority } from "@/types";

type DashboardTask = Task & {
    status: "open" | "completed" | "overdue";
};

const DEFAULT_TIMEZONE = "Europe/Berlin";

const getTodayKey = (timeZone: string) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());

    const values = Object.fromEntries(
        parts
            .filter((part) => part.type !== "literal")
            .map((part) => [part.type, part.value]),
    );

    return `${values.year}-${values.month}-${values.day}`;
};

const getTaskDateKey = (dueDate: string) => {
    return dueDate.slice(0, 10);
};

const getTaskStatus = (
    task: Task,
    timeZone: string,
): "open" | "completed" | "overdue" => {
    if (task.completed) {
        return "completed";
    }

    if (
        task.due_date &&
        getTaskDateKey(task.due_date) <
            getTodayKey(timeZone)
    ) {
        return "overdue";
    }

    return "open";
};

export function useDashboardTasks() {
    const [tasks, setTasks] =
        useState<DashboardTask[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState<string | null>(null);

    const [timezone, setTimezone] =
        useState(DEFAULT_TIMEZONE);

    const loadTasks = useCallback(async () => {
        setLoading(true);
        setError(null);

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            setTasks([]);
            setLoading(false);
            return;
        }

        const savedTimezone =
            typeof user.user_metadata?.timezone ===
                "string" &&
            user.user_metadata.timezone.trim()
                ? user.user_metadata.timezone
                : DEFAULT_TIMEZONE;

        setTimezone(savedTimezone);

        const {
            data,
            error: tasksError,
        } = await supabase
            .from("tasks")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", {
                ascending: false,
            });

        if (tasksError) {
            setError(tasksError.message);
            setTasks([]);
            setLoading(false);
            return;
        }

        const mapped = (data || []).map(
            (task) => ({
                ...task,
                priority:
                    (task.priority ||
                        "medium") as TaskPriority,
                status: getTaskStatus(
                    task as Task,
                    savedTimezone,
                ),
            }),
        ) as DashboardTask[];

        setTasks(mapped);
        setLoading(false);
    }, []);

    useEffect(() => {
        void loadTasks();
    }, [loadTasks]);

    const summary = useMemo(() => {
        const open = tasks.filter(
            (task) =>
                task.status === "open",
        ).length;

        const completed = tasks.filter(
            (task) =>
                task.status === "completed",
        ).length;

        const overdue = tasks.filter(
            (task) =>
                task.status === "overdue",
        ).length;

        const highPriorityOpen =
            tasks.filter(
                (task) =>
                    task.status !== "completed" &&
                    (
                        task.priority === "high" ||
                        task.priority === "urgent"
                    ),
            ).length;

        const nextDue =
            tasks
                .filter(
                    (task) =>
                        task.status === "open" &&
                        task.due_date,
                )
                .sort(
                    (a, b) =>
                        getTaskDateKey(
                            a.due_date || "",
                        ).localeCompare(
                            getTaskDateKey(
                                b.due_date || "",
                            ),
                        ),
                )[0] || null;

        return {
            total: tasks.length,
            open,
            completed,
            overdue,
            highPriorityOpen,
            nextDue,
        };
    }, [tasks]);

    return {
        tasks,
        loading,
        error,
        summary,
        timezone,
        refresh: loadTasks,
    };
}
