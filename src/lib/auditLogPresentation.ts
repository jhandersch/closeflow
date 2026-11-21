import { translateText, type AppLanguage } from "@/lib/i18n";

const eventLabels: Record<string, string> = {
  "member.role_changed": "Workspace member role changed",
  "member.removed": "Workspace member removed",
  "invite.created": "Workspace invitation created",
  "invite.revoked": "Workspace invitation revoked",
  "invite.accepted": "Workspace invitation accepted",
  "data.exported": "Workspace data exported",
  "automation.created": "Automation created",
  "automation.updated": "Automation updated",
  "automation.deleted": "Automation deleted",
  "integration.disconnected": "Integration disconnected",
  "plan.changed": "Workspace plan changed",
};

const payloadLabels: Record<string, string> = {
  target_user_id: "Target user ID",
  from_role: "Previous role",
  to_role: "New role",
  role: "Role",
  invite_id: "Invitation ID",
  kind: "Data type",
  format: "Format",
  rows: "Records",
  automation_id: "Automation ID",
  name: "Name",
  trigger_event: "Trigger event",
  enabled: "Enabled",
  provider: "Provider",
  plan: "Plan",
  scheduled: "Scheduled change",
};

const payloadValueLabels: Record<string, string> = {
  owner: "Owner",
  admin: "Administrator",
  member: "Member",
  viewer: "Read-only",
  leads: "Leads",
  customers: "Customers",
  csv: "CSV",
  xlsx: "Excel",
  google: "Google",
  free: "Free",
  pro: "Pro",
  business: "Business",
  true: "Yes",
  false: "No",
  cancel_at_period_end: "At the end of the billing period",
};

export function presentAuditEventType(eventType: string, language?: AppLanguage) {
  const label = eventLabels[eventType];
  return label ? translateText(label, language) : eventType;
}

export function presentAuditPayload(
  payload: Record<string, unknown> | null,
  language?: AppLanguage,
) {
  return Object.entries(payload ?? {})
    .map(([key, value]) => {
      const label = payloadLabels[key];
      const renderedLabel = label ? translateText(label, language) : key;
      const valueLabel = payloadValueLabels[String(value)];
      const renderedValue = valueLabel
        ? translateText(valueLabel, language)
        : String(value);
      return `${renderedLabel}: ${renderedValue}`;
    })
    .join(", ");
}
