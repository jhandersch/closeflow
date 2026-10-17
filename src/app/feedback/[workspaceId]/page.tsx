import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { verifyFeedbackToken } from "@/lib/feedbackToken";
import FeedbackForm from "./FeedbackForm";
type Props = {
    params: Promise<{
        workspaceId: string;
    }>;
    searchParams: Promise<{
        token?: string | string[];
    }>;
};
export default async function FeedbackPage({ params, searchParams }: Props) {
    const { workspaceId } = await params;
    const { token } = await searchParams;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRole || typeof token !== "string" || !verifyFeedbackToken(workspaceId, token, serviceRole)) {
        notFound();
    }
    const admin = createClient(url, serviceRole, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await admin
        .from("workspaces")
        .select("name")
        .eq("id", workspaceId)
        .maybeSingle();
    if (error) {
        throw error;
    }
    if (!data) {
        notFound();
    }
    return <FeedbackForm workspaceId={workspaceId} feedbackToken={token} companyName={data.name || undefined}/>;
}
