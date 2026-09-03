"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
export type NotificationItem = {
    id: string;
    title: string;
    message: string;
    level: "info" | "warning" | "critical";
    leadId: string;
    createdAt: string;
};
export function useNotifications() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const load = async () => {
        setLoading(true);
        setError(null);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setNotifications([]);
            setLoading(false);
            return;
        }
        const response = await fetch("/api/notifications");
        if (!response.ok) {
            setError("Could not load notifications");
            setLoading(false);
            return;
        }
        const data = (await response.json()) as NotificationItem[];
        setNotifications(data);
        setLoading(false);
    };
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, []);
    return {
        notifications,
        loading,
        error,
        refresh: load,
    };
}
