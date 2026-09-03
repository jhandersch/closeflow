"use client";
import { useState } from "react";
import type { TaskPriority } from "@/types";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
import { translatePriority, translateTaskStatus, } from "@/lib/translations/task";
type Props = {
    id: string;
    title: string;
    completed: boolean;
    dueDate: string | null;
    priority?: TaskPriority | null;
    onToggle: () => void;
    onDelete: () => void;
    onEdit: (id: string, updates: {
        title: string;
        priority: TaskPriority;
        due_date: string | null;
    }) => Promise<void>;
};
export default function TaskCard({ id, title, completed, dueDate, priority, onToggle, onDelete, onEdit, }: Props) {
    const { language } = useAppPreferences();
    const [editing, setEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(title);
    const [editDueDate, setEditDueDate] = useState(dueDate ? dueDate.slice(0, 10) : "");
    const [editPriority, setEditPriority] = useState<TaskPriority>(priority || "medium");
    const [saving, setSaving] = useState(false);
    const isOverdue = Boolean(dueDate &&
        !completed &&
        new Date(dueDate).getTime() < Date.now());
    const statusLabel = completed
        ? translateTaskStatus(true)
        : isOverdue
            ?
                "Overdue"
            : translateTaskStatus(false);
    const priorityLabel = translatePriority(priority);
    const saveEdit = async () => {
        if (!editTitle.trim())
            return;
        setSaving(true);
        try {
            await onEdit(id, {
                title: editTitle.trim(),
                priority: editPriority,
                due_date: editDueDate || null,
            });
            setEditing(false);
        }
        finally {
            setSaving(false);
        }
    };
    const cancelEdit = () => {
        setEditTitle(title);
        setEditDueDate(dueDate ? dueDate.slice(0, 10) : "");
        setEditPriority(priority || "medium");
        setEditing(false);
    };
    if (editing) {
        return (<div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
        <div className="space-y-3">
          <input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} placeholder={"Task title"} className="w-full rounded-xl border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-foreground outline-none"/>

          <div className="grid gap-3 md:grid-cols-2">
            <input type="date" value={editDueDate} onChange={(event) => setEditDueDate(event.target.value)} className="w-full rounded-xl border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-foreground outline-none"/>

            <select value={editPriority} onChange={(event) => setEditPriority(event.target.value as TaskPriority)} className="w-full rounded-xl border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-foreground outline-none">
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

          <div className="flex gap-2">
            <button type="button" onClick={() => void saveEdit()} disabled={saving || !editTitle.trim()} className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background disabled:opacity-50">
              {saving
                ?
                    "Saving..."
                :
                    "Save"}
            </button>

            <button type="button" onClick={cancelEdit} disabled={saving} className="rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-semibold text-foreground">
              {"Cancel"}
            </button>
          </div>
        </div>
      </div>);
    }
    return (<div className="flex items-center justify-between rounded-xl border border-border-subtle bg-surface-1 p-4">
      <div className="flex items-center gap-3">
        <input type="checkbox" checked={completed} onChange={onToggle}/>

        <div>
          <p className={completed
            ? "line-through text-foreground/55"
            : "text-foreground"}>
            {title}
          </p>

          <div className="mt-1 flex items-center gap-2">
            <span className="rounded-full bg-surface-2/80 px-2 py-0.5 text-[10px] font-semibold text-foreground/80">
              {priorityLabel}
            </span>

            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${["erledigt", "done", "Done"].includes(statusLabel)
            ? "bg-emerald-500/20 text-emerald-300"
            : [
                "overdue",
                "Overdue",
                "overdue",
            ].includes(statusLabel)
                ? "bg-red-500/20 text-red-300"
                : "bg-blue-500/20 text-blue-300"}`}>
              {statusLabel}
            </span>
          </div>

          {dueDate && (<p className="text-xs text-foreground/55">
              {"Due"}:{" "}
              {new Date(dueDate).toLocaleDateString("en-US")}
            </p>)}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setEditing(true)} className="text-sm text-cyan-400 hover:text-cyan-300">
          {"Edit"}
        </button>

        <button type="button" onClick={onDelete} className="text-sm text-red-400 hover:text-red-300">
          {"Delete"}
        </button>
      </div>
    </div>);
}
