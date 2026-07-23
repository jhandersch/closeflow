const { spawnSync } = require("node:child_process")

const npmExecPath = process.env.npm_execpath
const npmRunner = npmExecPath
  ? {
      command: process.execPath,
      baseArgs: [npmExecPath],
    }
  : {
      command: process.platform === "win32" ? "npm.cmd" : "npm",
      baseArgs: [],
    }

const steps = [
  {
    name: "Tenancy guard",
    args: ["run", "lint:tenancy"],
  },
  {
    name: "Production build",
    args: ["run", "build"],
  },
]

for (const step of steps) {
  console.log(`\n[verify-release] ${step.name} ...`)
  const result = spawnSync(npmRunner.command, [...npmRunner.baseArgs, ...step.args], {
    stdio: "inherit",
    shell: false,
  })

  if (result.status !== 0) {
    console.error(`\n[verify-release] Failed at: ${step.name}`)
    process.exit(result.status || 1)
  }
}

console.log("\n[verify-release] All release checks passed.")