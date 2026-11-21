import assert from "node:assert/strict";
import test from "node:test";
import {
  presentAuditEventType,
  presentAuditPayload,
} from "../src/lib/auditLogPresentation.ts";

test("audit event names are translated to German while unknown event types remain intact", () => {
  assert.equal(
    presentAuditEventType("member.role_changed", "de"),
    "Rolle eines Arbeitsbereichsmitglieds geändert",
  );
  assert.equal(presentAuditEventType("custom.event", "de"), "custom.event");
  assert.equal(presentAuditEventType("member.role_changed", "en"), "Workspace member role changed");
});

test("audit payload labels and known enum values are translated without rewriting user data", () => {
  assert.equal(
    presentAuditPayload(
      {
        to_role: "viewer",
        target_user_id: "user-123",
        enabled: false,
        name: "Mein eigener Ablauf",
      },
      "de",
    ),
    "Neue Rolle: Nur Lesen, ID des betroffenen Nutzers: user-123, Aktiviert: Nein, Name: Mein eigener Ablauf",
  );
});

test("audit payload formatting handles missing payloads", () => {
  assert.equal(presentAuditPayload(null, "de"), "");
});
