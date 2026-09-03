"use client";
import { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
import { supabase } from "@/lib/supabase/client";
import TaskBoard from "@/components/tasks/TaskBoard";
import TaskCalendar from "@/components/tasks/TaskCalendar";
import TaskFilters from "@/components/tasks/TaskFilters";
import type { Task, TaskPriority } from "@/types";
type LeadOption = {
    id: string;
    name: string | null;
    company: string | null;
};
const normalizePriority = (value: unknown): TaskPriority => {
    if (value === "low" ||
        value === "medium" ||
        value === "high" ||
        value === "urgent") {
        return value;
    }
    return "medium";
};
export default function TasksPage() {
    const { language } = useAppPreferences();
    const locale = "en-US";
    const [tasks, setTasks] = useState<Task[]>([]);
    const [leads, setLeads] = useState<LeadOption[]>([]);
    const [filter, setFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const [taskTitle, setTaskTitle] = useState("");
    const [taskLeadId, setTaskLeadId] = useState("");
    const [taskDueDate, setTaskDueDate] = useState("");
    const [taskPriority, setTaskPriority] = useState<TaskPriority>("medium");
    const [creatingTask, setCreatingTask] = useState(false);
    const [taskError, setTaskError] = useState<string | null>(null);
    const getCurrentUserId = async () => {
        const { data: { user }, } = await supabase.auth.getUser();
        return user?.id || null;
    };
    const logTaskActivity = async ({ leadId, workspaceId, userId, title, event, type, taskId, }: {
        leadId: string;
        workspaceId: string | null;
        userId: string;
        title: string;
        event: "task_created" | "task_updated" | "task_completed" | "task_reopened" | "task_deleted";
        type: "task_created" | "task_updated" | "task_completed" | "task_reopened" | "task_deleted";
        taskId: string;
    }) => {
        const { error } = await supabase
            .from("activities")
            .insert({
            workspace_id: workspaceId,
            lead_id: leadId,
            user_id: userId,
            type,
            title,
            description: title,
            action: title,
            metadata: {
                event,
                task_id: taskId,
            },
        });
        if (error) {
            console.error("Task activity log failed:", error);
        }
    };
    /*
     * =========================
     * WORKSPACE
     * =========================
     */
    const getWorkspaceId = async (userId: string) => {
        const { data: membership } = await supabase
            .from("workspace_members")
            .select("workspace_id")
            .eq("user_id", userId)
            .limit(1)
            .maybeSingle();
        return (membership?.workspace_id ||
            null);
    };
    /*
     * =========================
     * LOAD DATA
     * =========================
     */
    useEffect(() => {
        const load = async () => {
            const { data: { user }, } = await supabase.auth.getUser();
            if (!user) {
                setTasks([]);
                setLeads([]);
                setLoading(false);
                return;
            }
            const taskQuery = supabase
                .from("tasks")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", {
                ascending: false,
            });
            const leadQuery = supabase
                .from("leads")
                .select("id,name,company")
                .eq("user_id", user.id)
                .order("created_at", {
                ascending: false,
            })
                .limit(100);
            const [{ data: taskData, error: taskError }, { data: leadData, error: leadError },] = await Promise.all([
                taskQuery,
                leadQuery,
            ]);
            if (taskError) {
                console.error("Failed to load tasks:", taskError);
                setTaskError(taskError.message);
            }
            if (leadError) {
                console.error("Failed to load leads:", leadError);
            }
            const normalizedTasks = ((taskData || []) as Task[]).map((task) => ({
                ...task,
                priority: normalizePriority(task.priority),
            }));
            setTasks(normalizedTasks);
            const nextLeads = (leadData || []) as LeadOption[];
            setLeads(nextLeads);
            if (nextLeads.length > 0) {
                setTaskLeadId(nextLeads[0].id);
            }
            setLoading(false);
        };
        void load();
    }, []);
    /*
     * =========================
     * CREATE TASK
     * =========================
     */
    const createTask = async () => {
        setTaskError(null);
        if (!taskTitle.trim()) {
            setTaskError("Title is required.");
            return;
        }
        if (!taskLeadId) {
            setTaskError("Please select a lead.");
            return;
        }
        setCreatingTask(true);
        const { data: { user, }, } = await supabase.auth.getUser();
        if (!user) {
            setTaskError("Session expired. Please sign in again.");
            setCreatingTask(false);
            return;
        }
        const workspaceId = await getWorkspaceId(user.id);
        if (!workspaceId) {
            setTaskError("No workspace found.");
            setCreatingTask(false);
            return;
        }
        /*
         * IMPORTANT:
         *
         * Kein "description"-Feld,
         * weil die tasks-Tabelle
         * currently has no description column.
         */
        const { data, error, } = await supabase
            .from("tasks")
            .insert({
            workspace_id: workspaceId,
            user_id: user.id,
            lead_id: taskLeadId,
            title: taskTitle.trim(),
            due_date: taskDueDate || null,
            priority: taskPriority,
            completed: false,
        })
            .select()
            .single();
        if (error) {
            setTaskError(error.message);
            setCreatingTask(false);
            return;
        }
        const normalizedTask = {
            ...(data as Task),
            priority: normalizePriority((data as Task).priority),
        };
        await logTaskActivity({
            leadId: normalizedTask.lead_id,
            workspaceId: normalizedTask.workspace_id || workspaceId,
            userId: user.id,
            title: `Task created: ${normalizedTask.title}`,
            event: "task_created",
            type: "task_created",
            taskId: normalizedTask.id,
        });
        setTasks((current) => [
            normalizedTask,
            ...current,
        ]);
        setTaskTitle("");
        setTaskDueDate("");
        setTaskPriority("medium");
        setCreatingTask(false);
    };
    /*
     * =========================
     * COMPLETE / REOPEN
     * =========================
     */
    const toggleTask = async (task: Task) => {
        const userId = await getCurrentUserId();
        if (!userId) {
            return;
        }
        const nextCompleted = !task.completed;
        const completedAt = nextCompleted
            ? new Date().toISOString()
            : null;
        setTasks((current) => current.map((item) => item.id === task.id
            ? {
                ...item,
                completed: nextCompleted,
                completed_at: completedAt,
            }
            : item));
        const { error, } = await supabase
            .from("tasks")
            .update({
            completed: nextCompleted,
            completed_at: completedAt,
        })
            .eq("id", task.id);
        if (error) {
            setTasks((current) => current.map((item) => item.id === task.id
                ? task
                : item));
            return;
        }
        await logTaskActivity({
            leadId: task.lead_id,
            workspaceId: task.workspace_id || null,
            userId,
            title: nextCompleted
                ? "Task completed"
                : "Task reopened",
            event: nextCompleted
                ? "task_completed"
                : "task_reopened",
            type: nextCompleted
                ? "task_completed"
                : "task_reopened",
            taskId: task.id,
        });
    };
    const editTask = async (taskId: string, updates: {
        title: string;
        priority: TaskPriority;
        due_date: string | null;
    }) => {
        const userId = await getCurrentUserId();
        if (!userId) {
            setTaskError("Session expired. Please sign in again.");
            return;
        }
        const { data, error } = await supabase
            .from("tasks")
            .update({
            title: updates.title,
            priority: updates.priority,
            due_date: updates.due_date,
        })
            .eq("id", taskId)
            .select()
            .single();
        if (error) {
            setTaskError(error.message);
            return;
        }
        const updatedTask = {
            ...(data as Task),
            priority: normalizePriority((data as Task).priority),
        };
        setTasks((current) => current.map((task) => task.id === taskId
            ? updatedTask
            : task));
        await logTaskActivity({
            leadId: updatedTask.lead_id,
            workspaceId: updatedTask.workspace_id || null,
            userId,
            title: `Task updated: ${updates.title.trim()}`,
            event: "task_updated",
            type: "task_updated",
            taskId,
        });
    };
    /*
     * =========================
     * DELETE
     * =========================
     */
    const deleteTask = async (taskId: string) => {
        const removedTask = tasks.find((task) => task.id === taskId);
        const userId = await getCurrentUserId();
        if (!removedTask || !userId) {
            return;
        }
        const previous = tasks;
        setTasks((current) => current.filter((task) => task.id !== taskId));
        const { error, } = await supabase
            .from("tasks")
            .delete()
            .eq("id", taskId);
        if (error) {
            setTasks(previous);
            return;
        }
        await logTaskActivity({
            leadId: removedTask.lead_id,
            workspaceId: removedTask.workspace_id || null,
            userId,
            title: `Task deleted: ${removedTask.title}`,
            event: "task_deleted",
            type: "task_deleted",
            taskId,
        });
    };
    /*
     * =========================
     * FILTER
     * =========================
     */
    const filteredTasks = useMemo(() => {
        if (filter === "open") {
            return tasks.filter((task) => !task.completed);
        }
        if (filter === "completed") {
            return tasks.filter((task) => task.completed);
        }
        if (filter === "overdue") {
            const today = new Date()
                .toISOString()
                .slice(0, 10);
            return tasks.filter((task) => !task.completed &&
                task.due_date &&
                task.due_date.slice(0, 10) < today);
        }
        return tasks;
    }, [
        filter,
        tasks,
    ]);
    /*
     * =========================
     * UI
     * =========================
     */
    return (<AuthGuard>

      <div className="space-y-6">

        <div>

          <p className="
              text-sm
              uppercase
              tracking-[0.25em]
              text-cyan-400
            ">
            {"Tasks"}
          </p>


          <h1 className="
              mt-2
              text-3xl
              font-bold
              text-foreground
            ">
            {"Sales tasks"}
          </h1>


          <p className="
              mt-2
              text-sm
              text-foreground/65
            ">
            {"Track follow-up work across your workspace."}
          </p>

        </div>


        <section className="
            rounded-2xl
            border
            border-border-subtle
            bg-surface-1
            p-5
          ">

          <h2 className="
              text-lg
              font-semibold
              text-foreground
            ">
            {"Create task"}
          </h2>


          <div className="
              mt-4
              grid
              gap-3
              md:grid-cols-2
              xl:grid-cols-4
            ">

            <input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder={"Title"} className="
                w-full
                rounded-xl
                border
                border-border-subtle
                bg-surface-2
                px-4
                py-2
                text-sm
                text-foreground
                outline-none
              "/>


            <select value={taskLeadId} onChange={(event) => setTaskLeadId(event.target.value)} className="
                w-full
                rounded-xl
                border
                border-border-subtle
                bg-surface-2
                px-4
                py-2
                text-sm
                text-foreground
                outline-none
              ">

              {leads.length === 0 ? (<option value="">
                    {"No leads available"}
                  </option>) : (leads.map((lead) => (<option key={lead.id} value={lead.id}>
                        {(lead.name ||
                ("Untitled")) +
                (lead.company
                    ? ` - ${lead.company}`
                    : "")}
                      </option>)))}

            </select>


            <input type="date" value={taskDueDate} onChange={(event) => setTaskDueDate(event.target.value)} className="
                w-full
                rounded-xl
                border
                border-border-subtle
                bg-surface-2
                px-4
                py-2
                text-sm
                text-foreground
                outline-none
              "/>


            <select value={taskPriority} onChange={(event) => setTaskPriority(event.target.value as TaskPriority)} className="w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-2 text-sm text-foreground outline-none">
              <option value="low">
                {"Low"}
              </option>

              <option value="medium">
                {"Medium"}
              </option>

              <option value="high">
                {"High"}
              </option>

              <option value="urgent">
                {"Urgent"}
              </option>
            </select>

          </div>


          {taskError ? (<p className="
                  mt-3
                  text-sm
                  text-rose-300
                ">
                {taskError}
              </p>) : null}


          <div className="
              mt-4
              flex
              items-center
              justify-between
              gap-3
            ">

            <p className="
                text-xs
                text-foreground/55
              ">
              {"For active follow-up workflows."}
            </p>


            <button type="button" onClick={() => void createTask()} disabled={creatingTask ||
            leads.length === 0} className="
                rounded-xl
                bg-foreground
                px-4
                py-2
                text-sm
                font-semibold
                text-background
                disabled:opacity-60
              ">
              {creatingTask
            ? ("Saving...")
            : ("Save task")}
            </button>

          </div>

        </section>


        <TaskFilters value={filter} onChange={setFilter}/>


        {loading ? (<p className="
                text-foreground/65
              ">
              {"Loading..."}
            </p>) : (<div className="
                space-y-6
              ">

              <TaskBoard tasks={filteredTasks} onToggleTask={toggleTask} onDeleteTask={deleteTask} onEditTask={editTask} locale={locale}/>


              <TaskCalendar tasks={filteredTasks.filter((task) => Boolean(task.due_date))}/>

            </div>)}

      </div>

    </AuthGuard>);
}
