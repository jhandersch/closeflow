import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Meeting } from "@/types";
export function useMeetings(leadId: string) {
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(true);
    async function loadMeetings() {
        if (!leadId) {
            setMeetings([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        const { data, error } = await supabase
            .from("meetings")
            .select("*")
            .eq("lead_id", leadId)
            .order("starts_at", {
            ascending: false
        });
        if (error) {
            console.error(error);
            setMeetings([]);
        }
        else {
            setMeetings((data ?? []) as Meeting[]);
        }
        setLoading(false);
    }
    async function addMeeting(data: {
        title: string;
        description?: string;
        starts_at: string;
    }) {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;
        if (!user)
            throw new Error("No user");
        const { error } = await supabase
            .from("meetings")
            .insert({
            lead_id: leadId,
            user_id: user.id,
            title: data.title,
            description: data.description || null,
            starts_at: data.starts_at
        });
        if (error)
            throw error;
        await loadMeetings();
    }
    async function deleteMeeting(id: string) {
        const { error } = await supabase
            .from("meetings")
            .delete()
            .eq("id", id);
        if (error)
            throw error;
        await loadMeetings();
    }
    useEffect(() => {
        void loadMeetings();
    }, [leadId]);
    return {
        meetings,
        loading,
        addMeeting,
        deleteMeeting,
        refresh: loadMeetings
    };
}
