"use client";
import { useState } from "react";
import { translatePriority, translateTaskStatus } from "@/lib/translations/task";
import type { Task, TaskPriority } from "@/types";
type TaskBoardProps = {
    tasks: Task[];
    onToggleTask: (task: Task) => Promise<void>;
    onDeleteTask: (taskId: string) => Promise<void>;
    onEditTask: (taskId: string, updates: {
        title: string;
        priority: TaskPriority;
        due_date: string | null;
    }) => Promise<void>;
    locale: string;
};
export default function TaskBoard({ tasks, onToggleTask, onDeleteTask, onEditTask, locale, }: TaskBoardProps) {
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editPriority, setEditPriority] = useState<TaskPriority>("medium");
    const [editDueDate, setEditDueDate] = useState("");
    const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
    const open = tasks.filter((task) => !task.completed);
    const completed = tasks.filter((task) => task.completed);
    const startEditing = (task: Task) => {
        setEditingTaskId(task.id);
        setEditTitle(task.title);
        setEditPriority(task.priority as TaskPriority);
        setEditDueDate(task.due_date
            ? task.due_date.slice(0, 10)
            : "");
    };
    const cancelEditing = () => {
        setEditingTaskId(null);
        setEditTitle("");
        setEditPriority("medium");
        setEditDueDate("");
    };
    const saveEditing = async (taskId: string) => {
        if (!editTitle.trim()) {
            return;
        }
        setSavingTaskId(taskId);
        try {
            await onEditTask(taskId, {
                title: editTitle.trim(),
                priority: editPriority,
                due_date: editDueDate || null,
            });
            cancelEditing();
        }
        finally {
            setSavingTaskId(null);
        }
    };
    const renderEditForm = (task: Task) => {
        if (editingTaskId !== task.id) {
            return null;
        }
        return (<div className="mt-3 space-y-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
        <input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} placeholder="Task title" className="w-full rounded-lg border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-foreground outline-none"/>

        <div className="grid gap-2 sm:grid-cols-2">
          <select value={editPriority} onChange={(event) => setEditPriority(event.target.value as TaskPriority)} className="w-full rounded-lg border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-foreground outline-none">
            <option value="low">
              Low
            </option>

            <option value="medium">
              Medium
            </option>

            <option value="high">
              High
            </option>

            <option value="urgent">
              Urgent
            </option>
          </select>

          <input type="date" value={editDueDate} onChange={(event) => setEditDueDate(event.target.value)} className="w-full rounded-lg border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-foreground outline-none"/>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" disabled={savingTaskId === task.id} onClick={() => void saveEditing(task.id)} className="rounded-lg bg-foreground px-3 py-1 text-xs font-semibold text-background disabled:opacity-60">
            {savingTaskId === task.id
                ?
                    "Saving..."
                :
                    "Save"}
          </button>

          <button type="button" disabled={savingTaskId === task.id} onClick={cancelEditing} className="rounded-lg border border-border-subtle px-3 py-1 text-xs font-semibold text-foreground/70 disabled:opacity-60">
            {"Cancel"}
          </button>
        </div>
      </div>);
    };
    return (<div className="grid gap-4 md:grid-cols-2">
      <section className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
        <h2 className="text-lg font-semibold text-foreground">
          {"Open tasks"}
        </h2>

        <div className="mt-4 space-y-3">
          {open.length === 0 ? (<p className="text-sm text-foreground/55">
              {"No open tasks."}
            </p>) : (open.map((task) => (<div key={task.id} className="rounded-xl border border-border-subtle bg-surface-2/70 p-4">
                <p className="font-medium text-foreground">
                  {task.title}
                </p>

                <p className="mt-1 text-xs text-foreground/55">
                  {translatePriority(task.priority as any)}{" "}
                  {"priority"}
                </p>

                <p className="mt-1 text-xs text-foreground/55">
                  {task.due_date
                ? `${"Due"}: ${new Date(task.due_date).toLocaleDateString(locale)}`
                :
                    "No due date"}
                </p>

                {renderEditForm(task)}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => onToggleTask(task)} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                    {"Complete"}
                  </button>

                  <button type="button" onClick={() => startEditing(task)} className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                    {"Edit"}
                  </button>

                  <button type="button" onClick={() => onDeleteTask(task.id)} className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-300">
                    {"Delete"}
                  </button>
                </div>
              </div>)))}
        </div>
      </section>

      <section className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
        <h2 className="text-lg font-semibold text-foreground">
          {"Completed tasks"}
        </h2>

        <div className="mt-4 space-y-3">
          {completed.length === 0 ? (<p className="text-sm text-foreground/55">
              {"No completed tasks."}
            </p>) : (completed.map((task) => (<div key={task.id} className="rounded-xl border border-border-subtle bg-surface-2/70 p-4">
                <p className="font-medium text-foreground">
                  {task.title}
                </p>

                <p className="mt-1 text-xs text-foreground/55">
                  {translateTaskStatus(true)}
                </p>

                <p className="mt-1 text-xs text-foreground/55">
                  {translatePriority(task.priority as any)}{" "}
                  {"priority"}
                </p>

                {task.due_date ? (<p className="mt-1 text-xs text-foreground/55">
                    {"Due"}
                    :{" "}
                    {new Date(task.due_date).toLocaleDateString(locale)}
                  </p>) : null}

                {renderEditForm(task)}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => onToggleTask(task)} className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                    {"Reopen"}
                  </button>

                  <button type="button" onClick={() => startEditing(task)} className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                    {"Edit"}
                  </button>

                  <button type="button" onClick={() => onDeleteTask(task.id)} className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-300">
                    {"Delete"}
                  </button>
                </div>
              </div>)))}
        </div>
      </section>
    </div>);
}
