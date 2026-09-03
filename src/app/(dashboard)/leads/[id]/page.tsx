"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import { useLeadDetail } from "@/hooks/useLeadDetail";
import { useLeadActions } from "@/hooks/useLeadActions";
import { useTasks } from "@/hooks/useTasks";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
import type { Activity, TaskPriority, } from "@/types";
import LeadHeader from "@/components/leads/detail/LeadHeader";
import LeadTabs from "@/components/leads/detail/LeadTabs";
import LeadOverview from "@/components/leads/detail/LeadOverview";
import LeadTasks from "@/components/leads/detail/LeadTasks";
import LeadNotes from "@/components/leads/detail/LeadNotes";
import LeadMeetings from "@/components/leads/detail/LeadMeetings";
import LeadDetailsForm from "@/components/leads/detail/LeadDetailsForm";
import ActivityTimeline from "@/components/leads/ActivityTimeline";
import PipelineJourney from "@/components/leads/PipelineJourney";
import DealMetrics from "@/components/leads/DealMetrics";
import AILeadSummary from "@/components/leads/AILeadSummary";
import { calculateSalesScore } from "@/lib/salesScore";
import { getStaleDays } from "@/lib/scoring";
type Tab = "overview" | "activities" | "notes" | "tasks" | "meetings";
export default function LeadDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = typeof params.id === "string"
        ?
            params.id
        :
            "";
    const { language } = useAppPreferences();
    const { lead, setLead, activities, loading, refresh } = useLeadDetail(id);
    const { saveLead, deleteLead } = useLeadActions();
    const { tasks, addTask: addLeadTask, toggleTask: toggleLeadTask, editTask: editLeadTask, deleteTask: deleteLeadTask, refresh: refreshTasks, } = useTasks(id);
    const [localTaskActivities, setLocalTaskActivities] = useState<Activity[]>([]);
    const addLocalTaskActivity = (title: string, event: "task_created" | "task_updated" | "task_completed" | "task_reopened" | "task_deleted", taskId?: string) => {
        const localActivity: Activity = {
            id: `local-${Date.now()}-${Math.random()}`,
            lead_id: id,
            user_id: lead?.user_id || "local",
            type: event === "task_created"
                ? "task_created"
                : event === "task_completed"
                    ? "task_completed"
                    : "other",
            title,
            description: title,
            action: title,
            metadata: {
                event,
                task_id: taskId || null,
                optimistic: true,
            },
            created_at: new Date().toISOString(),
        };
        setLocalTaskActivities((previous) => [
            localActivity,
            ...previous,
        ]);
    };
    const timelineActivities = [
        ...localTaskActivities,
        ...activities,
    ];
    const addTask = async (title: string, dueDate?: string, priority?: TaskPriority) => {
        await addLeadTask(title, dueDate, priority);
        addLocalTaskActivity(`Task created: ${title.trim()}`, "task_created");
        await refresh();
    };
    const editTask = async (taskId: string, updates: {
        title: string;
        priority: TaskPriority;
        due_date: string | null;
    }) => {
        await editLeadTask(taskId, updates);
        addLocalTaskActivity(`Task updated: ${updates.title.trim()}`, "task_updated", taskId);
        await refresh();
    };
    const toggleTask = async (taskId: string, completed: boolean) => {
        await toggleLeadTask(taskId, completed);
        addLocalTaskActivity(completed
            ? "Task reopened"
            : "Task completed", completed
            ? "task_reopened"
            : "task_completed", taskId);
        await refresh();
    };
    const deleteTask = async (taskId: string) => {
        const task = tasks.find((entry) => entry.id === taskId);
        await deleteLeadTask(taskId);
        addLocalTaskActivity(`Task deleted: ${task?.title || taskId}`, "task_deleted", taskId);
        await refresh();
    };
    const [activeTab, setActiveTab] = useState<Tab>("overview");
    if (loading) {
        return (<div className="
rounded-3xl
border
border-border-subtle
bg-surface-1
p-8
">

Loading...

        </div>);
    }
    if (!lead) {
        return (<div className="
rounded-3xl
border
border-border-subtle
bg-surface-1
p-10
text-center
">

        <h1 className="text-xl font-semibold">

            {"Lead not found"}

        </h1>

        </div>);
    }
    const score = calculateSalesScore(lead, getStaleDays(lead));
    async function handleDelete() {
        if (!lead)
            return;
        const ok = window.confirm("Delete lead?");
        if (!ok)
            return;
        try {
            await deleteLead(lead.id);
            toast.success("Lead deleted");
            router.push("/leads");
        }
        catch (error) {
            console.error(error);
            toast.error("Could not delete lead");
        }
    }
    return (<div className="
mx-auto
max-w-[1200px]
space-y-6
">



    <LeadHeader lead={lead} onDelete={handleDelete}/>




        {activeTab === "overview"
            &&
                <PipelineJourney status={lead.status}/>}



    <LeadTabs active={activeTab} setActive={setActiveTab}/>





        {activeTab === "overview"
            &&
                <>


                <LeadOverview lead={lead}/>



                <DealMetrics dealAge={Math.floor((Date.now()
                        -
                            new Date(lead.created_at).getTime())
                        /
                            86400000)} priorityScore={score.priority} healthScore={score.health} value={lead.value} stageAge={0}/>



                <AILeadSummary lead={lead}/>



                <LeadDetailsForm lead={lead} saveLead={saveLead} onSaved={async (updatedLead) => {
                        setLead(updatedLead);
                        await refreshTasks();
                    }}/>


                </>}





        {activeTab === "activities"
            &&
                <ActivityTimeline activities={timelineActivities}/>}




        {activeTab === "tasks"
            &&
                <LeadTasks tasks={tasks} addTask={addTask} editTask={editTask} toggleTask={toggleTask} deleteTask={deleteTask}/>}




        {activeTab === "notes"
            &&
                <LeadNotes lead={lead} saveLead={saveLead}/>}




        {activeTab === "meetings"
            &&
                <LeadMeetings leadId={lead.id}/>}



    </div>);
}
