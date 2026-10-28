import type { TaskPriority } from "@/types";
import { translateText } from "@/lib/i18n";
export function translatePriority(priority: TaskPriority | null | undefined) {
    const value = priority || "medium";
    return translateText(value.charAt(0).toUpperCase() + value.slice(1));
}
export function translateTaskStatus(completed: boolean) {
    return translateText(completed ? "Done" : "Open");
}
