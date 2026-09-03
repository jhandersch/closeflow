import { supabase } from "@/lib/supabase/client";
export async function createTask({ workspaceId, userId, leadId, title, dueDate, priority = "medium", }: {
    workspaceId: string;
    userId: string;
    leadId: string;
    title: string;
    dueDate: string;
    priority?: string;
}) {
    const { error } = await supabase
        .from("tasks")
        .insert({
        workspace_id: workspaceId,
        user_id: userId,
        lead_id: leadId,
        title,
        due_date: dueDate,
        priority,
    });
    if (error) {
        throw error;
    }
}
