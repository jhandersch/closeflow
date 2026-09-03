export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";
export type Workspace = {
    id: string;
    name: string;
    owner_id: string;
    plan: string;
    created_at: string;
    updated_at?: string;
};
export type WorkspaceMember = {
    id: string;
    workspace_id: string;
    user_id: string;
    role: WorkspaceRole;
    created_at: string;
    profile?: UserProfile | null;
};
export type WorkspaceInvite = {
    id: string;
    workspace_id: string;
    email: string;
    role: WorkspaceRole;
    token: string;
    expires_at: string | null;
    created_at: string;
};
export type UserProfile = {
    id: string;
    full_name: string | null;
    username?: string | null;
    avatar_url: string | null;
    company_name: string | null;
    phone: string | null;
    timezone: string | null;
    language: string | null;
    onboarding_completed?: boolean;
    created_at?: string;
};
export type AiConversation = {
    id: string;
    workspace_id: string;
    user_id: string;
    lead_id: string | null;
    messages: unknown[];
    created_at: string;
};
export type LeadScore = {
    id: string;
    lead_id: string;
    score: number;
    confidence: number;
    reason: string;
    created_at: string;
};
export type RevenueEvent = {
    id: string;
    workspace_id: string;
    lead_id: string | null;
    amount: number;
    type: "won" | "lost" | "refund";
    created_at: string;
};
export type Subscription = {
    id: string;
    workspace_id: string;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    plan: string;
    status: string;
    current_period_end: string | null;
};
export type Usage = {
    workspace_id: string;
    ai_requests: number;
    lead_count: number;
    month: string;
};
export type SalesCopilotResponse = {
    headline: string;
    summary: string;
    urgentActions: {
        leadId: string;
        leadName: string;
        company?: string;
        reason: string;
        action: string;
        priority: "High" | "Medium" | "Low";
    }[];
    pipelineHealth: {
        score: number;
        status: "Healthy" | "Warning" | "Critical";
        explanation: string;
    };
    forecast: {
        value: number;
        explanation: string;
    };
};
