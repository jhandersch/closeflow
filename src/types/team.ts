export type TeamRole = "owner" | "admin" | "sales_manager" | "sales" | "viewer";
export type TeamMemberStatus = "active" | "invited";
export type TeamMember = {
    id: string;
    email: string;
    name: string;
    role: TeamRole;
    status: TeamMemberStatus;
};
export type TeamInvite = {
    email: string;
    role: TeamRole;
    status: "pending";
    created_at: string;
    expires_at?: string | null;
};
export type TeamWorkspace = {
    organization_name: string;
    organization_slug: string;
    members: TeamMember[];
    invites: TeamInvite[];
};
