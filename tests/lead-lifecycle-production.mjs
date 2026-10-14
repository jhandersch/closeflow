import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

if (process.env.CLOSEFLOW_ALLOW_PRODUCTION_TEST_FIXTURES !== "YES") {
  throw new Error("Refusing production DB fixture writes without explicit authorization.");
}

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || match[1] in process.env) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const baseUrl = process.env.BASE_URL;
if (!supabaseUrl || !publishableKey || !serviceRoleKey || !baseUrl) {
  throw new Error("Required Supabase or local application configuration is missing.");
}

const parsedSupabaseUrl = new URL(supabaseUrl);
if (
  parsedSupabaseUrl.protocol !== "https:" ||
  !parsedSupabaseUrl.hostname.endsWith(".supabase.co")
) {
  throw new Error("The lead lifecycle suite requires the configured remote Supabase project.");
}
const parsedBaseUrl = new URL(baseUrl);
if (
  parsedBaseUrl.protocol !== "http:" ||
  !["127.0.0.1", "localhost", "[::1]"].includes(parsedBaseUrl.hostname)
) {
  throw new Error("The lead lifecycle suite may only call a local loopback application.");
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const publicClient = createClient(supabaseUrl, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const marker = `CLOSEFLOW-LEAD-LIFECYCLE-${randomUUID()}`;
const email = `closeflow-lead-smoke-${randomUUID()}@example.invalid`;
const password = `Cf_${randomUUID()}_R8!`;
const month = new Date().toISOString().slice(0, 7);
let userId;
let workspaceId;
let leadId;
let calendarEventId;
let failure;

const request = (method, path, body) =>
  fetch(new URL(path, baseUrl), {
    method,
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

let accessToken;

const readCounts = async () => {
  const [activities, tasks, customers] = await Promise.all([
    admin
      .from("activities")
      .select("id,type")
      .eq("workspace_id", workspaceId)
      .eq("lead_id", leadId),
    admin
      .from("tasks")
      .select("id,title,deleted_at")
      .eq("workspace_id", workspaceId)
      .eq("lead_id", leadId),
    admin
      .from("customers")
      .select("id,status,revenue")
      .eq("workspace_id", workspaceId)
      .eq("lead_id", leadId),
  ]);
  for (const result of [activities, tasks, customers]) {
    if (result.error) throw new Error("Could not read marked lead lifecycle state.");
  }
  return {
    activities: activities.data,
    tasks: tasks.data,
    customers: customers.data,
  };
};

const run = async () => {
  const { data: createdUser, error: createUserError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { closeflow_test_marker: marker },
    });
  if (createUserError || !createdUser.user?.id) {
    throw new Error(`Could not create marked Auth fixture (${createUserError?.code || "unknown"}).`);
  }
  userId = createdUser.user.id;

  const { data: createdWorkspace, error: workspaceError } = await admin
    .from("workspaces")
    .insert({ name: marker, owner_id: userId, plan: "free" })
    .select("id")
    .single();
  if (workspaceError || !createdWorkspace?.id) {
    throw new Error(`Could not create marked workspace (${workspaceError?.code || "unknown"}).`);
  }
  workspaceId = createdWorkspace.id;

  const { error: memberError } = await admin.from("workspace_members").insert({
    workspace_id: workspaceId,
    user_id: userId,
    role: "owner",
  });
  if (memberError) throw new Error(`Could not assign fixture owner (${memberError.code || "unknown"}).`);

  const { error: usageError } = await admin.from("usage").insert({
    workspace_id: workspaceId,
    month,
    ai_requests: 0,
    exports_count: 0,
    updated_at: new Date().toISOString(),
  });
  if (usageError) throw new Error(`Could not initialize fixture usage (${usageError.code || "unknown"}).`);

  const { data: authData, error: authError } =
    await publicClient.auth.signInWithPassword({ email, password });
  if (authError || !authData.session?.access_token) {
    throw new Error(`Could not authenticate fixture user (${authError?.code || "unknown"}).`);
  }
  accessToken = authData.session.access_token;

  const importCsv = [
    "name,company,status,value,notes",
    `"Imported Contact ${marker}","Imported Co",new,2500,"Quoted ""note"" ${marker}"`,
    ',Missing Name,new,100,"Invalid row"',
    `"Invalid Value ${marker}","Imported Co",new,not-a-number,"Invalid number"`,
  ].join("\r\n");
  const importResponse = await request("POST", "/api/leads/import", {
    csv: importCsv,
  });
  assert.equal(importResponse.status, 200, "CSV lead import failed.");
  const imported = await importResponse.json();
  assert.equal(imported.inserted, 1);
  assert.equal(imported.skipped, 2);
  assert.equal(imported.issues.length, 2);

  const repeatedImportResponse = await request("POST", "/api/leads/import", {
    csv: importCsv,
  });
  assert.equal(repeatedImportResponse.status, 200, "Idempotent CSV import failed.");
  const repeatedImport = await repeatedImportResponse.json();
  assert.equal(repeatedImport.inserted, 0);
  assert.equal(repeatedImport.unchanged, 1);
  assert.equal(repeatedImport.skipped, 2);

  const createdResponse = await request("POST", "/api/leads", {
    name: `Lifecycle ${marker}`,
    company: `Company ${marker}`,
    status: "new",
    value: 12000,
    notes: marker,
  });
  assert.equal(createdResponse.status, 200, "Lead creation failed.");
  const createdLead = await createdResponse.json();
  assert.equal(createdLead.workspace_id, workspaceId);
  assert.equal(createdLead.user_id, userId);
  assert.equal(createdLead.status, "new");
  leadId = createdLead.id;

  const exportResponse = await request("GET", "/api/leads/export?format=csv");
  assert.equal(exportResponse.status, 200, "Lead CSV export failed.");
  assert.match(exportResponse.headers.get("content-type") || "", /text\/csv/i);
  const exportedCsv = await exportResponse.text();
  assert(exportedCsv.includes(createdLead.name));
  assert(exportedCsv.includes(`Imported Contact ${marker}`));
  const { data: exportedUsage, error: exportUsageError } = await admin
    .from("usage")
    .select("exports_count")
    .eq("workspace_id", workspaceId)
    .eq("month", month)
    .single();
  if (exportUsageError) throw new Error("Could not verify export usage accounting.");
  assert.equal(exportedUsage.exports_count, 1);

  const listResponse = await request("GET", "/api/leads");
  assert.equal(listResponse.status, 200, "Active lead listing failed.");
  assert((await listResponse.json()).some((lead) => lead.id === leadId));

  const eventCreatedResponse = await request("POST", "/api/calendar/events", {
    title: `Meeting ${marker}`,
    description: marker,
    scheduled_at: new Date(Date.now() + 86_400_000).toISOString(),
    lead_id: leadId,
    status: "scheduled",
  });
  assert.equal(eventCreatedResponse.status, 200, "Calendar event creation failed.");
  const createdEvent = await eventCreatedResponse.json();
  calendarEventId = createdEvent.id;
  assert.equal(createdEvent.workspace_id, workspaceId);
  assert.equal(createdEvent.lead_id, leadId);

  const eventUpdatedResponse = await request("PUT", "/api/calendar/events", {
    id: calendarEventId,
    title: `Updated meeting ${marker}`,
    scheduled_at: new Date(Date.now() + 172_800_000).toISOString(),
  });
  assert.equal(eventUpdatedResponse.status, 200, "Calendar event update failed.");
  assert.equal((await eventUpdatedResponse.json()).title, `Updated meeting ${marker}`);

  const eventDeletedResponse = await request(
    "DELETE",
    `/api/calendar/events?id=${encodeURIComponent(calendarEventId)}`,
  );
  assert.equal(eventDeletedResponse.status, 200, "Calendar event soft-delete failed.");
  const deletedEventState = await admin
    .from("calendar_events")
    .select("deleted_at,deleted_with_lead")
    .eq("id", calendarEventId)
    .eq("workspace_id", workspaceId)
    .single();
  if (deletedEventState.error || !deletedEventState.data?.deleted_at) {
    throw new Error("Deleted calendar event was not retained in trash.");
  }
  assert.equal(deletedEventState.data.deleted_with_lead, false);

  const eventRestoredResponse = await request(
    "POST",
    `/api/calendar/events/restore?id=${encodeURIComponent(calendarEventId)}`,
  );
  assert.equal(eventRestoredResponse.status, 200, "Calendar event restore failed.");
  const restoredEventState = await admin
    .from("calendar_events")
    .select("deleted_at")
    .eq("id", calendarEventId)
    .eq("workspace_id", workspaceId)
    .single();
  if (restoredEventState.error || restoredEventState.data?.deleted_at !== null) {
    throw new Error("Calendar event restore did not clear its soft-delete marker.");
  }

  const contactedResponse = await request("PUT", "/api/leads", {
    id: leadId,
    status: "contacted",
  });
  assert.equal(contactedResponse.status, 200, "Lead pipeline transition to contacted failed.");
  assert.equal((await contactedResponse.json()).status, "contacted");

  const repeatedContactedResponse = await request("PUT", "/api/leads", {
    id: leadId,
    status: "contacted",
  });
  assert.equal(repeatedContactedResponse.status, 200, "Idempotent status retry failed.");
  let state = await readCounts();
  assert.equal(state.activities.filter((activity) => activity.type === "status_changed").length, 1);
  assert.equal(state.tasks.filter((task) => task.title === `Follow up: ${createdLead.name}`).length, 1);
  const automationTask = state.tasks.find(
    (task) => task.title === `Follow up: ${createdLead.name}`,
  );
  const taskDueDate = new Date(Date.now() + 259_200_000).toISOString().slice(0, 10);
  const taskEdit = await publicClient
    .from("tasks")
    .update({ priority: "high", due_date: taskDueDate })
    .eq("id", automationTask.id)
    .eq("workspace_id", workspaceId)
    .select("priority,due_date")
    .single();
  if (taskEdit.error) throw new Error("Authenticated task edit failed.");
  assert.equal(taskEdit.data.priority, "high");
  assert.equal(taskEdit.data.due_date.slice(0, 10), taskDueDate);
  const completedAt = new Date().toISOString();
  const taskCompletion = await publicClient
    .from("tasks")
    .update({ completed: true, completed_at: completedAt })
    .eq("id", automationTask.id)
    .eq("workspace_id", workspaceId)
    .select("completed,completed_at")
    .single();
  if (taskCompletion.error) throw new Error("Authenticated task completion failed.");
  assert.equal(taskCompletion.data.completed, true);
  assert(taskCompletion.data.completed_at);
  const taskReopened = await publicClient
    .from("tasks")
    .update({ completed: false, completed_at: null })
    .eq("id", automationTask.id)
    .eq("workspace_id", workspaceId)
    .select("completed,completed_at")
    .single();
  if (taskReopened.error) throw new Error("Authenticated task reopen failed.");
  assert.equal(taskReopened.data.completed, false);
  assert.equal(taskReopened.data.completed_at, null);

  const wonResponse = await request("PUT", "/api/leads", {
    id: leadId,
    status: "won",
    value: 15000,
  });
  assert.equal(wonResponse.status, 200, "Lead transition to won failed.");
  assert.equal((await wonResponse.json()).status, "won");
  state = await readCounts();
  assert.equal(state.activities.filter((activity) => activity.type === "status_changed").length, 2);
  assert.equal(state.tasks.filter((task) => task.title === `Follow up: ${createdLead.name}`).length, 1);
  assert.equal(state.customers.length, 1, "Won lead did not synchronize to exactly one customer.");
  assert.equal(state.customers[0].status, "active");
  assert.equal(state.customers[0].revenue, 15000);

  const customerImportCsv = [
    "contact,company,revenue",
    `"Imported Customer ${marker}","Imported Customer Co",32000`,
    `"Lifecycle ${marker}","Company ${marker}",15000`,
    `"Bad Revenue ${marker}","Invalid Customer Co",not-a-number`,
  ].join("\r\n");
  const customerImportResponse = await request("POST", "/api/customers/import", {
    csv: customerImportCsv,
  });
  assert.equal(customerImportResponse.status, 200, "Customer CSV import failed.");
  const customerImport = await customerImportResponse.json();
  assert.equal(customerImport.inserted, 1);
  assert.equal(customerImport.skipped, 2);
  assert.equal(customerImport.issues.length, 2);

  const repeatedCustomerImportResponse = await request(
    "POST",
    "/api/customers/import",
    { csv: customerImportCsv },
  );
  assert.equal(repeatedCustomerImportResponse.status, 200, "Idempotent customer CSV import failed.");
  const repeatedCustomerImport = await repeatedCustomerImportResponse.json();
  assert.equal(repeatedCustomerImport.inserted, 0);
  assert.equal(repeatedCustomerImport.skipped, 3);

  const customerExportResponse = await request(
    "GET",
    "/api/customers/export?format=csv",
  );
  assert.equal(customerExportResponse.status, 200, "Customer CSV export failed.");
  assert.match(customerExportResponse.headers.get("content-type") || "", /text\/csv/i);
  const customerCsv = await customerExportResponse.text();
  assert(customerCsv.includes(`Company ${marker}`));
  assert(customerCsv.includes("15000"));
  assert(customerCsv.includes(`Imported Customer Co`));
  assert(customerCsv.includes("32000"));
  const { data: finalUsage, error: finalUsageError } = await admin
    .from("usage")
    .select("exports_count")
    .eq("workspace_id", workspaceId)
    .eq("month", month)
    .single();
  if (finalUsageError) throw new Error("Could not verify cumulative export accounting.");
  assert.equal(finalUsage.exports_count, 2);

  const deletedResponse = await request("DELETE", `/api/leads?id=${encodeURIComponent(leadId)}`);
  assert.equal(deletedResponse.status, 200, "Lead soft-delete failed.");
  const deletedLead = await admin
    .from("leads")
    .select("deleted_at")
    .eq("id", leadId)
    .eq("workspace_id", workspaceId)
    .single();
  if (deletedLead.error || !deletedLead.data?.deleted_at) {
    throw new Error("Soft-deleted lead was not retained in the trash.");
  }
  const cascadeDeletedEvent = await admin
    .from("calendar_events")
    .select("deleted_at,deleted_with_lead")
    .eq("id", calendarEventId)
    .eq("workspace_id", workspaceId)
    .single();
  if (cascadeDeletedEvent.error || !cascadeDeletedEvent.data?.deleted_at) {
    throw new Error("Lead soft-delete did not soft-delete its calendar event.");
  }
  assert.equal(cascadeDeletedEvent.data.deleted_with_lead, true);
  state = await readCounts();
  assert(state.tasks.find((task) => task.title === `Follow up: ${createdLead.name}`)?.deleted_at);

  const restoreResponse = await request(
    "PATCH",
    `/api/leads?id=${encodeURIComponent(leadId)}`,
  );
  assert.equal(restoreResponse.status, 200, "Lead restore failed.");
  assert.equal((await restoreResponse.json()).status, "won");
  const restoredLead = await admin
    .from("leads")
    .select("deleted_at")
    .eq("id", leadId)
    .eq("workspace_id", workspaceId)
    .single();
  if (restoredLead.error || restoredLead.data?.deleted_at !== null) {
    throw new Error("Lead restore did not clear its soft-delete marker.");
  }
  state = await readCounts();
  assert.equal(state.tasks.filter((task) => task.title === `Follow up: ${createdLead.name}` && task.deleted_at === null).length, 1);
  assert.equal(state.activities.filter((activity) => activity.type === "lead_restored").length, 1);
  const cascadeRestoredEvent = await admin
    .from("calendar_events")
    .select("deleted_at,deleted_with_lead")
    .eq("id", calendarEventId)
    .eq("workspace_id", workspaceId)
    .single();
  if (cascadeRestoredEvent.error || cascadeRestoredEvent.data?.deleted_at !== null) {
    throw new Error("Lead restore did not restore its dependent calendar event.");
  }
  assert.equal(cascadeRestoredEvent.data.deleted_with_lead, false);

  console.log("PASS CSV import validates malformed rows and an identical retry is unchanged.");
  console.log("PASS CSV export returned both fixture leads and incremented export usage exactly once.");
  console.log("PASS customer import skips duplicates/invalid values, retry inserted no duplicates, and export included expected revenue.");
  console.log("PASS calendar create/update/delete/restore and lead-linked calendar trash/restore cascade.");
  console.log("PASS authenticated task edit, completion, reopen, and lead-linked trash/restore.");
  console.log("PASS lead create/list and workspace attribution.");
  console.log("PASS contacted/won pipeline transitions; retries created neither duplicate status activity nor duplicate automation tasks.");
  console.log("PASS won lead synchronized to exactly one active customer with the expected revenue.");
  console.log("PASS soft-delete/restoration preserved the lead and restored its dependent task.");
};

const cleanup = async () => {
  if (workspaceId) {
    const { data: workspace, error } = await admin
      .from("workspaces")
      .select("id,name")
      .eq("id", workspaceId)
      .maybeSingle();
    if (error) throw new Error("Could not verify lifecycle workspace before cleanup.");
    if (workspace && workspace.name !== marker) {
      throw new Error("Lifecycle workspace identity check failed; refusing cleanup.");
    }
    if (workspace) {
      const { error: deleteError } = await admin
        .from("workspaces")
        .delete()
        .eq("id", workspaceId);
      if (deleteError) throw new Error("Could not delete marked lifecycle workspace.");
      const { data: remaining, error: verifyError } = await admin
        .from("workspaces")
        .select("id")
        .eq("id", workspaceId)
        .maybeSingle();
      if (verifyError || remaining) throw new Error("Lifecycle workspace cleanup failed verification.");
    }
  }
  if (userId) {
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error) throw new Error("Could not verify lifecycle user before cleanup.");
    if (data.user && data.user.user_metadata?.closeflow_test_marker !== marker) {
      throw new Error("Lifecycle user identity check failed; refusing cleanup.");
    }
    if (data.user) {
      const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
      if (deleteError) throw new Error("Could not delete marked lifecycle user.");
    }
    const { data: remainingUser, error: verifyError } =
      await admin.auth.admin.getUserById(userId);
    if (remainingUser.user || (verifyError && verifyError.status !== 404)) {
      throw new Error("Lifecycle Auth fixture cleanup failed verification.");
    }
  }
  if (workspaceId || userId) console.log("PASS marked lifecycle fixtures deleted and cleanup verified.");
};

try {
  await run();
} catch (error) {
  failure = error;
} finally {
  try {
    await cleanup();
  } catch (cleanupError) {
    failure = failure || cleanupError;
  }
}

if (failure) {
  console.error("Lead lifecycle fixture run failed.");
  console.error(failure instanceof Error ? failure.message : "Unknown test error.");
  process.exitCode = 1;
}
