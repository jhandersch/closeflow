import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const loadDotEnvLocal = () => {
  const envPath = path.join(process.cwd(), ".env.local")
  if (!fs.existsSync(envPath)) {
    return
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) {
      continue
    }

    const idx = trimmed.indexOf("=")
    if (idx <= 0) {
      continue
    }

    const key = trimmed.slice(0, idx).trim()
    const value = trimmed.slice(idx + 1)

    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

loadDotEnvLocal()

if (process.env.CLOSEFLOW_ALLOW_PRODUCTION_TEST_FIXTURES !== "YES") {
  throw new Error("Refusing fixture writes without explicit test-fixture authorization.")
}

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
]

const missing = required.filter((key) => !process.env[key])
if (missing.length > 0) {
  console.error("Missing required environment variables:")
  for (const key of missing) {
    console.error(`- ${key}`)
  }
  process.exit(1)
}

const baseUrl = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/+$/, "")
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const outputJson = process.argv.includes("--json")
const retainFixtures = process.argv.includes("--retain-fixtures")
const poolerPath = path.join(process.cwd(), "supabase", ".temp", "pooler-url")
const marker = `CLOSEFLOW-XTEN-${randomUUID()}`
const baseUrlObject = new URL(baseUrl)

if (!fs.existsSync(poolerPath)) {
  throw new Error("Linked Supabase pooler configuration is missing.")
}
if (
  baseUrlObject.protocol !== "http:" ||
  !["127.0.0.1", "localhost", "[::1]"].includes(baseUrlObject.hostname)
) {
  throw new Error("Cross-tenant fixtures may only target a local loopback application.")
}

const poolerUrl = new URL(fs.readFileSync(poolerPath, "utf8").trim())
const projectRef = new URL(supabaseUrl).hostname.split(".")[0]
if (decodeURIComponent(poolerUrl.username).split(".").at(-1) !== projectRef) {
  throw new Error("Pooler project reference does not match the configured Supabase project.")
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const publicClient = createClient(supabaseUrl, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const rand = () => Math.random().toString(36).slice(2, 10)
const createdUserIds = []
const createdWorkspaceIds = []
const createdLeadIds = []
const createdEventIds = []

const createUser = async (email, password) => {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { closeflow_test_marker: marker },
  })

  if (error || !data.user?.id) {
    throw new Error(`createUser failed for ${email}: ${error?.message || "unknown error"}`)
  }

  createdUserIds.push(data.user.id)
  return data.user.id
}

const signIn = async (email, password) => {
  const { data, error } = await publicClient.auth.signInWithPassword({ email, password })

  if (error || !data.session?.access_token) {
    throw new Error(`signIn failed for ${email}: ${error?.message || "unknown error"}`)
  }

  return data.session.access_token
}

const ensureWorkspace = async (userId, name) => {
  const existingMembership = await admin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle()

  if (existingMembership.error) {
    if ((existingMembership.error.message || "").includes("workspace_members")) {
      throw new Error(
        "workspace schema missing. Apply supabase/migrations/20260716_closeflow_revenue_os_foundation.sql to the target project and retry."
      )
    }
    throw new Error(`workspace_members lookup failed: ${existingMembership.error.message}`)
  }

  if (existingMembership.data?.workspace_id) {
    return existingMembership.data.workspace_id
  }

  const createdWorkspace = await admin
    .from("workspaces")
    .insert({
      name,
      owner_id: userId,
      plan: "free",
    })
    .select("id")
    .single()

  if (createdWorkspace.error || !createdWorkspace.data?.id) {
    throw new Error(`workspace create failed: ${createdWorkspace.error?.message || "missing id"}`)
  }

  createdWorkspaceIds.push(createdWorkspace.data.id)
  const membershipInsert = await admin.from("workspace_members").insert({
    workspace_id: createdWorkspace.data.id,
    user_id: userId,
    role: "owner",
  })

  if (membershipInsert.error) {
    throw new Error(`workspace membership insert failed: ${membershipInsert.error.message}`)
  }

  return createdWorkspace.data.id
}

const run = async () => {
  const suffix = `${Date.now()}-${rand()}`
  const password = `Cf_${rand()}_${rand()}_A1!`

  const userAEmail = `cross.tenant.a.${suffix}@closeflow.local`
  const userBEmail = `cross.tenant.b.${suffix}@closeflow.local`

  const userAId = await createUser(userAEmail, password)
  const userBId = await createUser(userBEmail, password)

  const userAToken = await signIn(userAEmail, password)

  const workspaceAId = await ensureWorkspace(userAId, `${marker}-A-${suffix}`)
  const workspaceBId = await ensureWorkspace(userBId, `${marker}-B-${suffix}`)

  const leadInsert = await admin
    .from("leads")
    .insert({
      workspace_id: workspaceBId,
      user_id: userBId,
      name: `${marker} Contact`,
      company: `${marker} Company`,
      status: "new",
      value: 12345,
      source: "other",
      notes: `${marker} workspace-b probe lead`,
    })
    .select("id")
    .single()

  if (leadInsert.error || !leadInsert.data?.id) {
    throw new Error(`probe lead insert failed: ${leadInsert.error?.message || "missing id"}`)
  }
  createdLeadIds.push(leadInsert.data.id)

  const eventInsert = await admin
    .from("calendar_events")
    .insert({
      workspace_id: workspaceBId,
      user_id: userBId,
      lead_id: leadInsert.data.id,
      title: `${marker} Event`,
      description: `${marker} workspace-b probe event`,
      scheduled_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      status: "scheduled",
    })
    .select("id")
    .single()

  if (eventInsert.error || !eventInsert.data?.id) {
    throw new Error(`probe event insert failed: ${eventInsert.error?.message || "missing id"}`)
  }
  createdEventIds.push(eventInsert.data.id)

  return {
    baseUrl,
    userABearerToken: userAToken,
    marker,
    fixtureUserIds: [userAId, userBId],
    fixtureWorkspaceIds: [workspaceAId, workspaceBId],
    fixtureLeadId: leadInsert.data.id,
    fixtureEventId: eventInsert.data.id,
    workspaceBLeadId: leadInsert.data.id,
    workspaceBEventId: eventInsert.data.id,
    workspaceBMarkerQuery: marker,
    workspaceBForbiddenMarker: marker,
  }
}

const cleanup = async () => {
  const failures = []
  const deleteByIds = async (table, ids) => {
    if (ids.length === 0) return
    const { error } = await admin.from(table).delete().in("id", ids)
    if (error) failures.push(table)
  }

  await deleteByIds("calendar_events", createdEventIds)
  await deleteByIds("leads", createdLeadIds)
  await deleteByIds("workspaces", createdWorkspaceIds)
  for (const userId of createdUserIds) {
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) failures.push("auth.users")
  }
  if (failures.length) {
    throw new Error(`Fixture cleanup failed for: ${[...new Set(failures)].join(", ")}.`)
  }
}

const main = async () => {
  let payload
  let failure
  try {
    payload = await run()
  } catch (error) {
    failure = error
  } finally {
    if (!retainFixtures || !payload) {
      try {
        await cleanup()
      } catch (error) {
        failure = failure || error
      }
    }
  }

  if (failure) {
    console.error("Cross-tenant bootstrap failed; fixture cleanup was attempted.")
    console.error(failure instanceof Error ? failure.message : "Unknown bootstrap error.")
    process.exitCode = 1
    return
  }

  if (outputJson) {
    console.log(JSON.stringify(payload))
  } else {
    console.log("Cross-tenant fixtures created for the authorized suite.")
    console.log("Fixture credentials are intentionally not printed.")
    if (retainFixtures) {
      console.log("Fixtures were retained because --retain-fixtures was specified.")
    } else {
      console.log("Fixtures were deleted after bootstrap.")
    }
  }
}

main().catch((error) => {
  console.error("Cross-tenant bootstrap failed.")
  console.error(error instanceof Error ? error.message : "Unknown bootstrap error.")
  process.exitCode = 1
})