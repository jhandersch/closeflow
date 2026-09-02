const fs = require("node:fs")
const path = require("node:path")

const projectRoot = process.cwd()
const apiRoot = path.join(projectRoot, "src", "app", "api")

const USER_ID_FILTER = /\.eq\(\s*["']user_id["']\s*,\s*user\.id\s*\)/g

// Endpoints intentionally bound to user identity rather than workspace scope.
const ALLOWLIST = new Set([
  "src/app/api/profile/delete/route.ts",
  "src/app/api/security/recovery-codes/regenerate/route.ts",
  "src/app/api/security/recovery-codes/status/route.ts",
  "src/app/api/security/recovery-codes/verify/route.ts",
  "src/app/api/workspaces/create/route.ts",
  "src/app/api/workspaces/route.ts",
  "src/app/api/me/permissions/route.ts",
  "src/app/api/workspaces/invite/accept/route.ts",
])

const walk = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const absolute = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walk(absolute))
      continue
    }

    if (entry.isFile() && absolute.endsWith(".ts")) {
      files.push(absolute)
    }
  }

  return files
}

const toPosixRelative = (absolutePath) =>
  path.relative(projectRoot, absolutePath).split(path.sep).join("/")

const violations = []

for (const filePath of walk(apiRoot)) {
  const relativePath = toPosixRelative(filePath)
  const source = fs.readFileSync(filePath, "utf8")
  const matches = source.match(USER_ID_FILTER) || []

  if (matches.length === 0) {
    continue
  }

  if (ALLOWLIST.has(relativePath)) {
    continue
  }

  violations.push({
    path: relativePath,
    count: matches.length,
  })
}

if (violations.length > 0) {
  console.error("Tenancy check failed. Unexpected user_id-only filters found:")
  for (const violation of violations) {
    console.error(`- ${violation.path} (${violation.count} match${violation.count === 1 ? "" : "es"})`)
  }
  process.exit(1)
}

console.log("Tenancy check passed.")