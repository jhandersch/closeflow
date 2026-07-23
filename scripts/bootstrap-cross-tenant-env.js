const { createClient } = require("@supabase/supabase-js")
const fs = require("node:fs")
const path = require("node:path")

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

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const publicClient = createClient(supabaseUrl, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const rand = () => Math.random().toString(36).slice(2, 10)

const createUser = async (email, password) => {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error || !data.user?.id) {
    throw new Error(`createUser failed for ${email}: ${error?.message || "unknown error"}`)
  }

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
  const marker = `XTEN-${Date.now()}-${rand()}`

  const userAEmail = `cross.tenant.a.${suffix}@closeflow.local`
  const userBEmail = `cross.tenant.b.${suffix}@closeflow.local`

  const userAId = await createUser(userAEmail, password)
  const userBId = await createUser(userBEmail, password)

  const userAToken = await signIn(userAEmail, password)
  const userBToken = await signIn(userBEmail, password)

  await ensureWorkspace(userAId, `Cross Tenant A ${suffix}`)
  const workspaceBId = await ensureWorkspace(userBId, `Cross Tenant B ${suffix}`)

  const leadInsert = await admin
    .from("leads")
    .insert({
      workspace_id: workspaceBId,
      user_id: userBId,
      name: `${marker} Contact`,
      company: `${marker} Company`,
      status: "qualified",
      value: 12345,
      source: "other",
      notes: `${marker} workspace-b probe lead`,
    })
    .select("id")
    .single()

  if (leadInsert.error || !leadInsert.data?.id) {
    throw new Error(`probe lead insert failed: ${leadInsert.error?.message || "missing id"}`)
  }

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

  const payload = {
    baseUrl,
    userAEmail,
    userBEmail,
    userABearerToken: userAToken,
    userBBearerToken: userBToken,
    workspaceBLeadId: leadInsert.data.id,
    workspaceBEventId: eventInsert.data.id,
    workspaceBMarkerQuery: marker,
    workspaceBForbiddenMarker: marker,
  }

  if (outputJson) {
    console.log(JSON.stringify(payload))
    return
  }

  console.log("Cross-tenant bootstrap complete.")
  console.log("Set these env variables in your shell:")
  console.log(`BASE_URL=${payload.baseUrl}`)
  console.log(`USER_A_BEARER_TOKEN=${payload.userABearerToken}`)
  console.log(`USER_B_BEARER_TOKEN=${payload.userBBearerToken}`)
  console.log(`WORKSPACE_B_LEAD_ID=${payload.workspaceBLeadId}`)
  console.log(`WORKSPACE_B_EVENT_ID=${payload.workspaceBEventId}`)
  console.log(`WORKSPACE_B_MARKER_QUERY=${payload.workspaceBMarkerQuery}`)
  console.log(`WORKSPACE_B_FORBIDDEN_MARKER=${payload.workspaceBForbiddenMarker}`)
}

run().catch((error) => {
  console.error("Cross-tenant bootstrap failed.")
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})