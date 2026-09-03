import type { TaskPriority } from "@/types";
export function translatePriority(priority: TaskPriority | null | undefined) {
    const value = priority || "medium";
    return value.charAt(0).toUpperCase() + value.slice(1);
}
export function translateTaskStatus(completed: boolean) {
    return completed
        ? ("Done")
        : ("Open");
}
