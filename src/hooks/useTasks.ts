"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import type { ActivityType, Task, TaskPriority } from "@/types";
export function useTasks(leadId: string) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const getLeadWorkspaceId = async () => {
        if (!leadId) {
            return null;
        }
        const { data: lead, error } = await supabase
            .from("leads")
            .select("workspace_id")
            .eq("id", leadId)
            .single();
        if (error) {
            console.error("Lead workspace lookup failed:", error);
            return null;
        }
        return lead?.workspace_id || null;
    };
    const createActivity = async ({ userId, workspaceId, title, type, metadata = {}, }: {
        userId: string;
        workspaceId: string | null;
        title: string;
        type: ActivityType;
        metadata?: Record<string, unknown>;
    }) => {
        const { error } = await supabase
            .from("activities")
            .insert({
            workspace_id: workspaceId,
            lead_id: leadId,
            user_id: userId,
            title,
            description: title,
            action: title,
            type,
            metadata,
        });
        if (error) {
            console.error("Activity creation failed:", error);
            throw error;
        }
    };
    const createActivitySafe = async ({ userId, workspaceId, title, type, metadata = {}, }: {
        userId: string;
        workspaceId: string | null;
        title: string;
        type: ActivityType;
        metadata?: Record<string, unknown>;
    }) => {
        try {
            await createActivity({
                userId,
                workspaceId,
                title,
                type,
                metadata,
            });
        }
        catch (error) {
            // Do not fail the task mutation when activity logging fails.
            console.warn("Task activity logging skipped:", error);
            const message = error instanceof Error
                ? error.message
                : "Unknown error";
            toast.error(`Could not save activity: ${message}`);
        }
    };
    const resolveWorkspaceId = async (preferredWorkspaceId?: string | null) => {
        if (preferredWorkspaceId) {
            return preferredWorkspaceId;
        }
        return getLeadWorkspaceId();
    };
    const loadTasks = async () => {
        if (!leadId) {
            setTasks([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        const { data: { user }, } = await supabase.auth.getUser();
        if (!user) {
            setTasks([]);
            setLoading(false);
            return;
        }
        const { data, error } = await supabase
            .from("tasks")
            .select("*")
            .eq("lead_id", leadId)
            .order("created_at", {
            ascending: false,
        });
        if (error) {
            console.error("Loading tasks failed:", error);
            setTasks([]);
            setLoading(false);
            return;
        }
        setTasks((data || []) as Task[]);
        setLoading(false);
    };
    useEffect(() => {
        void loadTasks();
    }, [leadId]);
    /*
     * CREATE TASK
     */
    const addTask = async (title: string, dueDate?: string, priority: TaskPriority = "medium") => {
        const { data: { user }, } = await supabase.auth.getUser();
        if (!user) {
            throw new Error("Not authenticated");
        }
        const workspaceId = await getLeadWorkspaceId();
        if (!workspaceId) {
            throw new Error("No workspace found");
        }
        const { data: createdTask, error } = await supabase
            .from("tasks")
            .insert({
            workspace_id: workspaceId,
            user_id: user.id,
            lead_id: leadId,
            title: title.trim(),
            due_date: dueDate || null,
            priority,
            completed: false,
        })
            .select()
            .single();
        if (error) {
            console.error("Task creation failed:", error);
            throw error;
        }
        if (!createdTask) {
            throw new Error("Task was not created");
        }
        setTasks((previous) => [
            createdTask as Task,
            ...previous,
        ]);
        /*
         * ACTIVITY
         */
        await createActivitySafe({
            userId: user.id,
            workspaceId,
            title: `Task created: ${title.trim()}`,
            type: "task_created",
            metadata: {
                event: "task_created",
                task_id: createdTask.id,
                due_date: dueDate || null,
                priority,
            },
        });
    };
    const editTask = async (id: string, updates: {
        title: string;
        priority: TaskPriority;
        due_date: string | null;
    }) => {
        const { data: { user }, } = await supabase.auth.getUser();
        if (!user) {
            throw new Error("Not authenticated");
        }
        const title = updates.title.trim();
        if (!title) {
            throw new Error("Task title is required");
        }
        const { data: updatedTask, error } = await supabase
            .from("tasks")
            .update({
            title,
            priority: updates.priority,
            due_date: updates.due_date,
        })
            .eq("id", id)
            .select()
            .single();
        if (error) {
            console.error("Task update failed:", error);
            throw error;
        }
        if (!updatedTask) {
            throw new Error("Task was not updated");
        }
        const workspaceId = await resolveWorkspaceId(updatedTask.workspace_id ?? null);
        setTasks((previous) => previous.map((task) => task.id === id
            ? (updatedTask as Task)
            : task));
        await createActivitySafe({
            userId: user.id,
            workspaceId,
            title: `Task updated: ${title}`,
            type: "other",
            metadata: {
                event: "task_updated",
                task_id: id,
                title,
                priority: updates.priority,
                due_date: updates.due_date,
            },
        });
    };
    /*
     * COMPLETE / REOPEN
     */
    const toggleTask = async (id: string, completed: boolean) => {
        const currentTask = tasks.find((task) => task.id === id);
        const nextCompleted = !completed;
        const completedAt = nextCompleted
            ? new Date().toISOString()
            : null;
        /*
         * Optimistic UI
         */
        setTasks((previous) => previous.map((task) => task.id === id
            ? {
                ...task,
                completed: nextCompleted,
                completed_at: completedAt,
            }
            : task));
        const { error } = await supabase
            .from("tasks")
            .update({
            completed: nextCompleted,
            completed_at: completedAt,
        })
            .eq("id", id);
        if (error) {
            console.error("Task update failed:", error);
            await loadTasks();
            throw error;
        }
        const { data: { user }, } = await supabase.auth.getUser();
        if (!user) {
            return;
        }
        const workspaceId = await resolveWorkspaceId(currentTask?.workspace_id ?? null);
        /*
         * ACTIVITY
         */
        if (nextCompleted) {
            await createActivitySafe({
                userId: user.id,
                workspaceId,
                title: "Task completed",
                type: "task_completed",
                metadata: {
                    event: "task_completed",
                    task_id: id,
                },
            });
        }
        else {
            await createActivitySafe({
                userId: user.id,
                workspaceId,
                title: "Task reopened",
                type: "other",
                metadata: {
                    event: "task_reopened",
                    task_id: id,
                },
            });
        }
    };
    /*
     * DELETE
     */
    const deleteTask = async (id: string) => {
        const task = tasks.find((item) => item.id === id);
        const previous = tasks;
        setTasks((current) => current.filter((item) => item.id !== id));
        const { error } = await supabase
            .from("tasks")
            .delete()
            .eq("id", id);
        if (error) {
            console.error("Task deletion failed:", error);
            setTasks(previous);
            throw error;
        }
        const { data: { user }, } = await supabase.auth.getUser();
        if (!user) {
            return;
        }
        const workspaceId = await resolveWorkspaceId(task?.workspace_id ?? null);
        /*
         * ACTIVITY
         */
        await createActivitySafe({
            userId: user.id,
            workspaceId,
            title: `Task deleted: ${task?.title || id}`,
            type: "other",
            metadata: {
                event: "task_deleted",
                task_id: id,
                task_title: task?.title || null,
            },
        });
    };
    return {
        tasks,
        loading,
        addTask,
        editTask,
        toggleTask,
        deleteTask,
        refresh: loadTasks,
    };
}
