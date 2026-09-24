import type { LeadStatus } from "@/types";

export type StatusNextAction = {
  action: string;
  actionDate: string | null;
};

const actionByStatus: Record<LeadStatus, string> = {
  new: "No action planned",
  contacted: "Follow up with lead",
  proposal: "Follow up on proposal",
  won: "Ask the customer for feedback",
  lost: "Request feedback on the decision and schedule a reactivation follow-up",
};

const daysByStatus: Partial<Record<LeadStatus, number>> = {
  contacted: 3,
  proposal: 5,
  won: 14,
  lost: 7,
};

export function getDefaultStatusNextAction(status: LeadStatus, now = new Date()): StatusNextAction {
  const days = daysByStatus[status];
  if (!days) return { action: actionByStatus[status], actionDate: null };

  const actionDate = new Date(now);
  actionDate.setDate(actionDate.getDate() + days);
  return { action: actionByStatus[status], actionDate: actionDate.toISOString() };
}

export function getVisibleLeadNextAction(status: LeadStatus, currentAction?: string | null) {
  const action = currentAction?.trim();
  const outdatedWonActions = new Set([
    "Follow up on proposal",
    "Follow up with lead",
    "Hand off to onboarding",
    "No action planned",
  ]);
  const outdatedLostActions = new Set([
    "Follow up on proposal",
    "Follow up with lead",
    "Review the deal and re-engage",
    "No action planned",
  ]);

  if (status === "won" && (!action || outdatedWonActions.has(action))) {
    return "Ask the customer for feedback";
  }
  if (status === "lost" && (!action || outdatedLostActions.has(action))) {
    return "Request feedback on the decision and schedule a reactivation follow-up";
  }
  return action || getDefaultStatusNextAction(status).action;
}
