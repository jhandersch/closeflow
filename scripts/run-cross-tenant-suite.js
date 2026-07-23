const { spawnSync } = require("node:child_process")

const HELP_TEXT = `
CloseFlow cross-tenant full suite

Required environment variables:
  BASE_URL

Optional environment variables:
  REQUEST_TIMEOUT_MS
  PROBE_MARKER

Usage:
  npm run test:cross-tenant:suite
`

const hasHelpFlag = process.argv.includes("--help") || process.argv.includes("-h")
if (hasHelpFlag) {
  console.log(HELP_TEXT.trim())
  process.exit(0)
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

const runNode = (scriptPath, env, args = []) => {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    env,
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"],
  })

  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout)
    if (result.stderr) process.stderr.write(result.stderr)
    throw new Error(`${scriptPath} failed with exit code ${result.status || 1}`)
  }

  return result.stdout.trim()
}

const run = () => {
  console.log("[cross-tenant-suite] Step 1/2: Bootstrapping users/workspaces/probe data ...")

  const seedOutput = runNode("scripts/bootstrap-cross-tenant-env.js", {
    ...process.env,
    OUTPUT_JSON: "1",
  }, ["--json"])

  let seeded
  try {
    seeded = JSON.parse(seedOutput)
  } catch {
    throw new Error(`Could not parse bootstrap output as JSON: ${seedOutput}`)
  }

  console.log("[cross-tenant-suite] Step 2/2: Running negative API tests as UserA ...")

  const testOutput = runNode("scripts/cross-tenant-negative-tests.js", {
    ...process.env,
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
}

try {
  run()
} catch (error) {
  console.error("[cross-tenant-suite] Suite failed.")
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}