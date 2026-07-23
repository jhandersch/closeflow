const HELP_TEXT = `
CloseFlow cross-tenant probe seed

Required environment variables:
  BASE_URL               Example: https://closeflow.example.com
  USER_B_BEARER_TOKEN    Access token for UserB in WorkspaceB

Optional environment variables:
  PROBE_MARKER           Override generated marker
  REQUEST_TIMEOUT_MS     Default: 20000
  OUTPUT_JSON            Set to 1 for JSON output

Usage:
  npm run test:cross-tenant:seed
`

const hasHelpFlag = process.argv.includes("--help") || process.argv.includes("-h")
if (hasHelpFlag) {
  console.log(HELP_TEXT.trim())
  process.exit(0)
}

const required = ["BASE_URL", "USER_B_BEARER_TOKEN"]
const missing = required.filter((key) => !process.env[key])
if (missing.length > 0) {
  console.error("Missing required environment variables:")
  for (const key of missing) {
    console.error(`- ${key}`)
  }
  console.error("\nRun with --help for usage details.")
  process.exit(1)
}

const baseUrl = process.env.BASE_URL.replace(/\/+$/, "")
const token = process.env.USER_B_BEARER_TOKEN
const marker = process.env.PROBE_MARKER || `XTEN-${Date.now()}`
const timeoutMs = Number(process.env.REQUEST_TIMEOUT_MS || "20000")
const outputJson = process.env.OUTPUT_JSON === "1"

const authHeaders = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
}

const timedFetch = async (url, options = {}) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

const parseJsonSafe = async (response) => {
  try {
    return await response.json()
  } catch {
    return null
  }
}

const run = async () => {
  const ensureWorkspaceResponse = await timedFetch(`${baseUrl}/api/workspaces/create`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      name: `Cross Tenant Probe ${marker}`,
    }),
  })

  // 200 = created, 400 = already exists for this user, both are acceptable.
  if (![200, 400].includes(ensureWorkspaceResponse.status)) {
    const errorBody = await parseJsonSafe(ensureWorkspaceResponse)
    throw new Error(
      `Workspace ensure failed with status ${ensureWorkspaceResponse.status}: ${JSON.stringify(errorBody)}`
    )
  }

  const leadResponse = await timedFetch(`${baseUrl}/api/leads`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      name: `${marker} Contact`,
      company: `${marker} Company`,
      status: "qualified",
      value: 12345,
      source: "other",
      notes: `${marker} workspace-b probe lead`,
    }),
  })

  if (leadResponse.status !== 200) {
    const errorBody = await parseJsonSafe(leadResponse)
    throw new Error(`Lead seed failed with status ${leadResponse.status}: ${JSON.stringify(errorBody)}`)
  }

  const lead = await leadResponse.json()
  const leadId = lead?.id
  if (!leadId) {
    throw new Error("Lead seed failed: missing lead id")
  }

  const scheduledAt = new Date(Date.now() + 3600 * 1000).toISOString()
  const eventResponse = await timedFetch(`${baseUrl}/api/calendar/events`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      lead_id: leadId,
      title: `${marker} Event`,
      description: `${marker} workspace-b probe event`,
      scheduled_at: scheduledAt,
      status: "scheduled",
    }),
  })

  if (eventResponse.status !== 200) {
    const errorBody = await parseJsonSafe(eventResponse)
    throw new Error(`Event seed failed with status ${eventResponse.status}: ${JSON.stringify(errorBody)}`)
  }

  const event = await eventResponse.json()
  const eventId = event?.id
  if (!eventId) {
    throw new Error("Event seed failed: missing event id")
  }

  const payload = {
    marker,
    workspaceBLeadId: leadId,
    workspaceBEventId: eventId,
    workspaceBMarkerQuery: marker,
    workspaceBForbiddenMarker: marker,
  }

  if (outputJson) {
    console.log(JSON.stringify(payload))
    return
  }

  console.log("Cross-tenant probe data seeded in WorkspaceB.")
  console.log("Use these environment values for test:cross-tenant:")
  console.log(`WORKSPACE_B_LEAD_ID=${payload.workspaceBLeadId}`)
  console.log(`WORKSPACE_B_EVENT_ID=${payload.workspaceBEventId}`)
  console.log(`WORKSPACE_B_MARKER_QUERY=${payload.workspaceBMarkerQuery}`)
  console.log(`WORKSPACE_B_FORBIDDEN_MARKER=${payload.workspaceBForbiddenMarker}`)
}

run().catch((error) => {
  console.error("Cross-tenant probe seed failed.")
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})