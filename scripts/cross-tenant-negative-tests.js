const REQUIRED_ENV = [
  "BASE_URL",
  "USER_A_BEARER_TOKEN",
  "WORKSPACE_B_LEAD_ID",
  "WORKSPACE_B_EVENT_ID",
  "WORKSPACE_B_MARKER_QUERY",
  "WORKSPACE_B_FORBIDDEN_MARKER",
]

const HELP_TEXT = `
CloseFlow cross-tenant negative tests

Required environment variables:
  BASE_URL                    Example: https://closeflow.example.com
  USER_A_BEARER_TOKEN         Access token for UserA in WorkspaceA
  WORKSPACE_B_LEAD_ID         Lead ID that belongs to WorkspaceB
  WORKSPACE_B_EVENT_ID        Calendar event ID that belongs to WorkspaceB
  WORKSPACE_B_MARKER_QUERY    Unique query that only exists in WorkspaceB
  WORKSPACE_B_FORBIDDEN_MARKER String that appears in WorkspaceB export rows

Optional environment variables:
  REQUEST_TIMEOUT_MS          Default: 20000

Usage:
  npm run test:cross-tenant
`

const hasHelpFlag = process.argv.includes("--help") || process.argv.includes("-h")

if (hasHelpFlag) {
  console.log(HELP_TEXT.trim())
  process.exit(0)
}

const missing = REQUIRED_ENV.filter((key) => !process.env[key])
if (missing.length > 0) {
  console.error("Missing required environment variables:")
  for (const key of missing) {
    console.error(`- ${key}`)
  }
  console.error("\nRun with --help for usage details.")
  process.exit(1)
}

const baseUrl = process.env.BASE_URL.replace(/\/+$/, "")
const token = process.env.USER_A_BEARER_TOKEN
const workspaceBLeadId = process.env.WORKSPACE_B_LEAD_ID
const workspaceBEventId = process.env.WORKSPACE_B_EVENT_ID
const markerQuery = process.env.WORKSPACE_B_MARKER_QUERY
const forbiddenMarker = process.env.WORKSPACE_B_FORBIDDEN_MARKER
const timeoutMs = Number(process.env.REQUEST_TIMEOUT_MS || "20000")

const authHeaders = {
  Authorization: `Bearer ${token}`,
}

const expectOneOf = (status, allowed, testName) => {
  if (!allowed.includes(status)) {
    throw new Error(`${testName} failed: expected status ${allowed.join("/")}, got ${status}`)
  }
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

const run = async () => {
  const results = []

  // 1) Search isolation: querying WorkspaceB marker must return no results.
  {
    const url = `${baseUrl}/api/search?q=${encodeURIComponent(markerQuery)}`
    const response = await timedFetch(url, { headers: authHeaders })
    expectOneOf(response.status, [200], "search isolation")
    const payload = await response.json()
    const leads = Array.isArray(payload?.leads) ? payload.leads : []
    const tasks = Array.isArray(payload?.tasks) ? payload.tasks : []
    if (leads.length > 0 || tasks.length > 0) {
      throw new Error(`search isolation failed: expected empty results, got leads=${leads.length}, tasks=${tasks.length}`)
    }
    results.push("search isolation: ok")
  }

  // 2) Lead score isolation: UserA must not score WorkspaceB lead.
  {
    const url = `${baseUrl}/api/leads/${encodeURIComponent(workspaceBLeadId)}/score`
    const response = await timedFetch(url, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    })
    expectOneOf(response.status, [403, 404], "lead score isolation")
    results.push("lead score isolation: ok")
  }

  // 3) Next-action isolation: UserA must not access WorkspaceB lead plan.
  {
    const url = `${baseUrl}/api/leads/${encodeURIComponent(workspaceBLeadId)}/next-action`
    const response = await timedFetch(url, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    })
    expectOneOf(response.status, [403, 404], "next-action isolation")
    results.push("next-action isolation: ok")
  }

  // 4) Calendar update isolation: UserA must not update WorkspaceB event.
  {
    const url = `${baseUrl}/api/calendar/events`
    const response = await timedFetch(url, {
      method: "PUT",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: workspaceBEventId,
        title: "Cross-tenant update probe",
      }),
    })
    expectOneOf(response.status, [403, 404], "calendar update isolation")
    results.push("calendar update isolation: ok")
  }

  // 5) Calendar delete isolation: UserA must not delete WorkspaceB event.
  {
    const url = `${baseUrl}/api/calendar/events?id=${encodeURIComponent(workspaceBEventId)}`
    const response = await timedFetch(url, {
      method: "DELETE",
      headers: authHeaders,
    })
    expectOneOf(response.status, [403, 404], "calendar delete isolation")
    results.push("calendar delete isolation: ok")
  }

  // 6) Leads export isolation: WorkspaceB marker must not appear.
  {
    const url = `${baseUrl}/api/leads/export?format=csv`
    const response = await timedFetch(url, { headers: authHeaders })
    expectOneOf(response.status, [200, 403], "leads export isolation")
    if (response.status === 403) {
      results.push("leads export isolation: ok (export blocked by policy/limit)")
    } else {
    const csv = await response.text()
    if (csv.includes(forbiddenMarker)) {
      throw new Error("leads export isolation failed: forbidden marker found in export")
    }
    results.push("leads export isolation: ok")
    }
  }

  // 7) Customers export isolation: WorkspaceB marker must not appear.
  {
    const url = `${baseUrl}/api/customers/export?format=csv`
    const response = await timedFetch(url, { headers: authHeaders })
    expectOneOf(response.status, [200, 403], "customers export isolation")
    if (response.status === 403) {
      results.push("customers export isolation: ok (export blocked by policy/limit)")
    } else {
    const csv = await response.text()
    if (csv.includes(forbiddenMarker)) {
      throw new Error("customers export isolation failed: forbidden marker found in export")
    }
    results.push("customers export isolation: ok")
    }
  }

  console.log("Cross-tenant negative tests passed:")
  for (const line of results) {
    console.log(`- ${line}`)
  }
}

run().catch((error) => {
  console.error("Cross-tenant negative tests failed.")
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})