export const workspaceCapacityByPlan = {
  free: 1,
  pro: 1,
  business: 5,
} as const;

export type WorkspaceSubscriptionPlan = {
  plan: string;
  status: string | null;
  current_period_end: string | null;
};

export function resolveWorkspacePlan(
  workspacePlan: string,
  subscription: WorkspaceSubscriptionPlan | null,
  now = Date.now(),
) {
  if (!subscription) {
    const plan = workspacePlan.toLowerCase();
    return plan === "pro" || plan === "business" ? plan : "free";
  }

  const currentPeriodEnd = subscription.current_period_end
    ? Date.parse(subscription.current_period_end)
    : 0;
  const subscriptionIsActive =
    subscription.status === "active" ||
    subscription.status === "trialing" ||
    (subscription.status !== null &&
      ["past_due", "canceled"].includes(subscription.status) &&
      currentPeriodEnd > now);
  const plan = subscription.plan.toLowerCase();

  return subscriptionIsActive && (plan === "pro" || plan === "business")
    ? plan
    : "free";
}

type WorkspaceCapacityEntry = {
  owner_id: string;
  plan: string;
};

export function getOwnedWorkspaceCapacity(
  workspaces: WorkspaceCapacityEntry[],
  userId: string,
) {
  const ownedWorkspaces = workspaces.filter(
    (workspace) => workspace.owner_id === userId,
  );
  const hasBusinessWorkspace = ownedWorkspaces.some(
    (workspace) => workspace.plan.toLowerCase() === "business",
  );
  const limit = hasBusinessWorkspace
    ? workspaceCapacityByPlan.business
    : workspaceCapacityByPlan.free;

  return {
    ownedCount: ownedWorkspaces.length,
    limit,
    canCreate: ownedWorkspaces.length < limit,
  };
}
