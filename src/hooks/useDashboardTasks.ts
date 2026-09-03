import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Task, TaskPriority } from "@/types";
type DashboardTask = Task & {
    status: "open" | "completed" | "overdue";
};
const getTaskStatus = (task: Task): "open" | "completed" | "overdue" => {
    if (task.completed)
        return "completed";
    if (task.due_date && new Date(task.due_date).getTime() < Date.now())
        return "overdue";
    return "open";
};
export function useDashboardTasks() {
    const [tasks, setTasks] = useState<DashboardTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const loadTasks = useCallback(async () => {
        setLoading(true);
        setError(null);
        const { data: { user }, error: userError, } = await supabase.auth.getUser();
        if (userError || !user) {
            setTasks([]);
            setLoading(false);
            return;
        }
        const { data, error } = await supabase
            .from("tasks")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });
        if (error) {
            setError(error.message);
            setTasks([]);
            setLoading(false);
            return;
        }
        const mapped = (data || []).map((task) => ({
            ...task,
            priority: (task.priority || "medium") as TaskPriority,
            status: getTaskStatus(task as Task),
        })) as DashboardTask[];
        setTasks(mapped);
        setLoading(false);
    }, []);
    useEffect(() => {
        void loadTasks();
    }, [loadTasks]);
    const summary = useMemo(() => {
        const open = tasks.filter((task) => task.status === "open").length;
        const completed = tasks.filter((task) => task.status === "completed").length;
        const overdue = tasks.filter((task) => task.status === "overdue").length;
        const highPriorityOpen = tasks.filter((task) => task.status !== "completed" && (task.priority === "high" || task.priority === "urgent")).length;
        const nextDue = tasks
            .filter((task) => task.status !== "completed" && task.due_date)
            .sort((a, b) => new Date(a.due_date || "").getTime() - new Date(b.due_date || "").getTime())[0] || null;
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
        refresh: loadTasks,
    };
}
