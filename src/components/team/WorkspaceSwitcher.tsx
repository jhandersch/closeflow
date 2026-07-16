"use client"

import type { Workspace } from "@/types"

type WorkspaceSwitcherProps = {
  workspaces: Workspace[]
  selectedWorkspaceId: string | null
  onSelect: (workspaceId: string) => void
}

export default function WorkspaceSwitcher({ workspaces, selectedWorkspaceId, onSelect }: WorkspaceSwitcherProps) {
  return (
    <label className="block rounded-2xl border border-border-subtle bg-surface-1 p-4 text-sm text-foreground/70">
      Workspace
      <select
        value={selectedWorkspaceId || workspaces[0]?.id || ""}
        onChange={(event) => onSelect(event.target.value)}
        className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400"
      >
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.name} {workspace.plan ? `(${workspace.plan})` : ""}
          </option>
        ))}
      </select>
    </label>
  )
}
