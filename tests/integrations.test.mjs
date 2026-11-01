import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";

import { decryptJson, encryptJson, signOAuthState, verifyOAuthState } from "../src/lib/integrations/crypto.ts";
import { buildGoogleAuthUrl, buildRawEmail, createGoogleCalendarEvent, listGoogleCalendarEvents, mapGoogleEvent, sendGmail } from "../src/lib/integrations/google.ts";
const key = randomBytes(32).toString("base64");

test("encryption round-trips and rejects tampering or wrong keys", () => {
  const payload = encryptJson({ refreshToken: "secret" }, key);
  assert.deepEqual(decryptJson(payload, key), { refreshToken: "secret" });
  assert.ok(!payload.includes("secret"));
  assert.throws(() => decryptJson(payload, randomBytes(32).toString("base64")));
  const parts = payload.split(".");
  parts[2] = Buffer.from("tampered").toString("base64");
  assert.throws(() => decryptJson(parts.join("."), key));
  assert.throws(() => encryptJson({}, "short"));
});

test("OAuth state is bound to the user and expires", () => {
  const now = Date.now();
  const state = signOAuthState("user-1", key, now);
  assert.equal(verifyOAuthState(state, "user-1", key, now + 1000), true);
  assert.equal(verifyOAuthState(state, "user-2", key, now + 1000), false);
  assert.equal(verifyOAuthState(state, "user-1", key, now + 11 * 60 * 1000), false);
  assert.equal(verifyOAuthState(`${state.startsWith("A") ? "B" : "A"}${state.slice(1)}`, "user-1", key, now), false);
  assert.equal(verifyOAuthState("garbage", "user-1", key, now), false);
});

test("Google auth URL requests offline access with Gmail and Calendar scopes", () => {
  const url = new URL(
    buildGoogleAuthUrl({ clientId: "id", clientSecret: "s", redirectUri: "https://app.test/cb" }, "state-1"),
  );
  assert.equal(url.searchParams.get("access_type"), "offline");
  assert.equal(url.searchParams.get("state"), "state-1");
  assert.match(url.searchParams.get("scope"), /gmail\.send/);
  assert.match(url.searchParams.get("scope"), /calendar\.events/);
});

test("raw emails encode subject/body and block header injection", () => {
  const raw = Buffer.from(
    buildRawEmail({ to: "a@b.de\r\nBcc: evil@x.de", subject: "Hällo\r\nBcc: evil@x.de", body: "Text ü" }),
    "base64url",
  ).toString("utf8");
  const headers = raw.split("\r\n\r\n")[0].split("\r\n");
  assert.ok(headers.every((line) => !line.startsWith("Bcc:")));
  assert.ok(headers[1].startsWith("Subject: =?UTF-8?B?"));
  assert.equal(Buffer.from(raw.split("\r\n\r\n")[1], "base64").toString("utf8"), "Text ü");
});

test("Google events are mapped and paged for import", async () => {
  assert.equal(mapGoogleEvent({ id: "a", status: "cancelled", start: { dateTime: "2026-11-05T10:00:00Z" } }), null);
  assert.equal(mapGoogleEvent({ id: "a" }), null);
  assert.deepEqual(mapGoogleEvent({ id: "b", summary: "  Call ", start: { dateTime: "2026-11-05T10:00:00+01:00" } }), {
    googleEventId: "b",
    title: "Call",
    description: null,
    scheduledAt: "2026-11-05T09:00:00.000Z",
  });
  assert.equal(mapGoogleEvent({ id: "c", start: { date: "2026-11-06" } }).scheduledAt, "2026-11-06T12:00:00.000Z");
  assert.equal(mapGoogleEvent({ id: "d", start: { date: "2026-11-06" } }).title, "(ohne Titel)");

  const urls = [];
  const pages = [
    { items: [{ id: "1", summary: "A", start: { dateTime: "2026-11-05T10:00:00Z" } }], nextPageToken: "p2" },
    { items: [{ id: "2", summary: "B", start: { dateTime: "2026-11-06T10:00:00Z" } }] },
  ];
  const items = await listGoogleCalendarEvents(
    "tok",
    { from: new Date("2026-10-01T00:00:00Z"), to: new Date("2027-10-01T00:00:00Z") },
    async (url, init) => {
      urls.push(url);
      assert.equal(init.headers.Authorization, "Bearer tok");
      return { ok: true, status: 200, json: async () => pages[urls.length - 1] };
    },
  );
  assert.deepEqual(items.map((item) => item.googleEventId), ["1", "2"]);
  assert.match(urls[0], /singleEvents=true/);
  assert.match(urls[1], /pageToken=p2/);
  await assert.rejects(listGoogleCalendarEvents("tok", { from: new Date(), to: new Date() }, async () => ({ ok: false, status: 403 })));
});

test("Gmail and Calendar calls use bearer auth and fail loudly", async () => {
  const calls = [];
  const fetchOk = async (target, init) => {
    calls.push({ target, auth: init.headers.Authorization });
    return { ok: true, status: 200, json: async () => ({ id: "evt-1" }) };
  };
  await sendGmail("tok", { to: "a@b.de", subject: "s", body: "b" }, fetchOk);
  const id = await createGoogleCalendarEvent("tok", { title: "Call", startsAt: "2026-11-05T10:00:00.000Z" }, fetchOk);
  assert.equal(id, "evt-1");
  assert.ok(calls.every((call) => call.auth === "Bearer tok"));
  const fetchFail = async () => ({ ok: false, status: 401 });
  await assert.rejects(sendGmail("tok", { to: "a@b.de", subject: "s", body: "b" }, fetchFail));
  await assert.rejects(createGoogleCalendarEvent("tok", { title: "x", startsAt: "2026-11-05T10:00:00.000Z" }, fetchFail));
});
