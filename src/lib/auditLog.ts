import { createAdminClient } from "@/lib/supabase/admin";

export type AuditEventType =
  | "member.role_changed"
  | "member.removed"
  | "invite.created"
  | "invite.revoked"
  | "invite.accepted"
  | "data.exported"
  | "automation.created"
  | "automation.updated"
  | "automation.deleted"
  | "integration.disconnected"
  | "plan.changed";

type AuditInput = {
  workspaceId: string;
  actorUserId: string | null;
  eventType: AuditEventType;
  payload?: Record<string, unknown>;
};

const SENSITIVE_KEY = /token|secret|password|authorization|api[_-]?key/i;

// Keeps payloads small and free of credentials; only flat, short values are stored.
export const sanitizeAuditPayload = (payload: Record<string, unknown> = {}) => {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (SENSITIVE_KEY.test(key)) continue;
    if (typeof value === "string") clean[key] = value.slice(0, 200);
    else if (typeof value === "number" || typeof value === "boolean" || value === null) clean[key] = value;
  }
  return clean;
};

/*
 * Append-only security trail in audit_logs. Clients cannot update or delete
 * rows (no policies), so entries are written with the service role.
 * Never throws: a failed log write must not break the user action.
 */
export async function recordAuditEvent(input: AuditInput): Promise<boolean> {
  try {
    const { error } = await createAdminClient().from("audit_logs").insert({
      workspace_id: input.workspaceId,
      actor_user_id: input.actorUserId,
      event_type: input.eventType,
      payload: sanitizeAuditPayload(input.payload),
    });
    if (error) {
      console.error("Audit log write failed:", error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Audit log write failed:", error instanceof Error ? error.message : error);
    return false;
  }
}
