import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const HELP_TEXT = `
CloseFlow cross-tenant full suite

Required environment variables:
  BASE_URL

Optional environment variables:
  REQUEST_TIMEOUT_MS

Usage:
  CLOSEFLOW_ALLOW_PRODUCTION_TEST_FIXTURES=YES BASE_URL=http://127.0.0.1:3187 npm run test:cross-tenant:suite
`

const hasHelpFlag = process.argv.includes("--help") || process.argv.includes("-h")
if (hasHelpFlag) {
  console.log(HELP_TEXT.trim())
  process.exit(0)
}

const loadDotEnvLocal = () => {
  const envPath = path.join(process.cwd(), ".env.local")
  if (!fs.existsSync(envPath)) return

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (!match || match[1] in process.env) continue
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "")
  }
}

loadDotEnvLocal()

if (process.env.CLOSEFLOW_ALLOW_PRODUCTION_TEST_FIXTURES !== "YES") {
  throw new Error("Refusing cross-tenant fixture writes without explicit authorization.")
}

const required = ["BASE_URL"]
const missing = required.filter((key) => !process.env[key])
if (missing.length > 0) {
  console.error("Missing required environment variables:")
  for (const key of missing) {
    console.error(`- ${key}`)
  }
  console.error("\nRun with --help for usage details.")
  process.exit(1)
}

const baseUrl = new URL(process.env.BASE_URL)
if (
  baseUrl.protocol !== "http:" ||
  !["127.0.0.1", "localhost", "[::1]"].includes(baseUrl.hostname)
) {
  throw new Error("Cross-tenant suite may only send requests to a local loopback application.")
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const poolerPath = path.join(process.cwd(), "supabase", ".temp", "pooler-url")
if (!supabaseUrl || !serviceRoleKey || !fs.existsSync(poolerPath)) {
  throw new Error("Supabase fixture cleanup configuration is missing.")
}
const projectRef = new URL(supabaseUrl).hostname.split(".")[0]
const poolerUrl = new URL(fs.readFileSync(poolerPath, "utf8").trim())
if (decodeURIComponent(poolerUrl.username).split(".").at(-1) !== projectRef) {
  throw new Error("Pooler project reference does not match the configured Supabase project.")
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const runNode = (scriptPath, env, args = []) => {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    env,
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"],
  })

  if (result.status !== 0) {
    throw new Error(`${scriptPath} failed with exit code ${result.status || 1}`)
  }

  return result.stdout.trim()
}

const cleanupFixtures = async (fixture) => {
  if (!fixture) return
  const failures = []
  const workspaceIds = fixture.fixtureWorkspaceIds

  const deleteFixtureRow = async (table, id, markerColumn, marker) => {
    if (!id) return
    const { data, error } = await admin
      .from(table)
      .select(`id,workspace_id,${markerColumn}`)
      .eq("id", id)
      .maybeSingle()
    if (error) {
      failures.push(`${table} lookup`)
      return
    }
    if (!data) return
    if (
      !workspaceIds.includes(data.workspace_id) ||
      typeof data[markerColumn] !== "string" ||
      !data[markerColumn].includes(marker)
    ) {
      failures.push(`${table} fixture identity check`)
      return
    }
    const { error: deleteError } = await admin.from(table).delete().eq("id", id)
    if (deleteError) failures.push(`${table} deletion`)
  }

  await deleteFixtureRow(
    "calendar_events",
    fixture.fixtureEventId,
    "description",
    fixture.marker,
  )
  await deleteFixtureRow("leads", fixture.fixtureLeadId, "notes", fixture.marker)

  if (Array.isArray(workspaceIds) && workspaceIds.length) {
    const { data, error } = await admin
      .from("workspaces")
      .select("id,name")
      .in("id", workspaceIds)
    if (error) {
      failures.push("workspaces lookup")
    } else {
      const confirmedIds = data
        .filter((workspace) => workspace.name?.includes(fixture.marker))
        .map((workspace) => workspace.id)
      if (confirmedIds.length !== data.length) {
        failures.push("workspace fixture identity check")
      } else if (confirmedIds.length) {
        const { error: deleteError } = await admin
          .from("workspaces")
          .delete()
          .in("id", confirmedIds)
        if (deleteError) failures.push("workspaces deletion")
      }
    }
  }

  for (const userId of fixture.fixtureUserIds || []) {
    const { data, error } = await admin.auth.admin.getUserById(userId)
    if (error) {
      failures.push("Auth user lookup")
      continue
    }
    if (!data.user) continue
    if (data.user.user_metadata?.closeflow_test_marker !== fixture.marker) {
      failures.push("Auth user fixture identity check")
      continue
    }
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
    if (deleteError) failures.push("Auth user deletion")
  }

  if (failures.length) {
    throw new Error(`Fixture cleanup incomplete: ${[...new Set(failures)].join(", ")}.`)
  }
}

const run = async () => {
  let seeded
  let suiteError
  try {
  console.log("[cross-tenant-suite] Step 1/2: Bootstrapping users/workspaces/probe data ...")

  const seedOutput = runNode("scripts/bootstrap-cross-tenant-env.mjs", {
    ...process.env,
    OUTPUT_JSON: "1",
  }, ["--json", "--retain-fixtures"])

  try {
    seeded = JSON.parse(seedOutput)
  } catch {
    throw new Error("Could not parse cross-tenant fixture metadata.")
  }

  console.log("[cross-tenant-suite] Step 2/2: Running negative API tests as UserA ...")

  const testOutput = runNode("scripts/cross-tenant-negative-tests.js", {
    ...process.env,
    BASE_URL: process.env.BASE_URL,
    USER_A_BEARER_TOKEN: seeded.userABearerToken,
    WORKSPACE_B_LEAD_ID: seeded.workspaceBLeadId,
    WORKSPACE_B_EVENT_ID: seeded.workspaceBEventId,
    WORKSPACE_B_MARKER_QUERY: seeded.workspaceBMarkerQuery,
    WORKSPACE_B_FORBIDDEN_MARKER: seeded.workspaceBForbiddenMarker,
  })

  if (testOutput) {
    console.log(testOutput)
  }

  console.log("[cross-tenant-suite] Suite passed.")
  } catch (error) {
    suiteError = error
  } finally {
    try {
      await cleanupFixtures(seeded)
      if (seeded) console.log("[cross-tenant-suite] Marker-scoped fixtures cleaned up.")
    } catch (error) {
      suiteError = suiteError || error
    }
  }

  if (suiteError) throw suiteError
}

run().catch((error) => {
  console.error("[cross-tenant-suite] Suite failed.")
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})