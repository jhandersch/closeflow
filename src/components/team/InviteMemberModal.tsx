"use client"

import { useState } from "react"
import type { WorkspaceRole } from "@/types"
import RoleSelector from "@/components/team/RoleSelector"

type InviteMemberModalProps = {
  open: boolean
  onClose: () => void
  onInvite: (payload: { email: string; role: WorkspaceRole }) => Promise<void> | void
}

export default function InviteMemberModal({ open, onClose, onInvite }: InviteMemberModalProps) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<WorkspaceRole>("member")
  const [saving, setSaving] = useState(false)

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-border-subtle bg-surface-1 p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-foreground">Mitglied einladen</h2>
          <button type="button" onClick={onClose} className="text-sm text-foreground/55 hover:text-foreground">
            Schließen
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block text-sm text-foreground/70">
            E-Mail
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-foreground outline-none focus:border-cyan-400"
              placeholder="name@company.com"
            />
          </label>

          <label className="block text-sm text-foreground/70">
            Rolle
            <div className="mt-2">
              <RoleSelector value={role} onChange={setRole} />
            </div>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-border-subtle px-4 py-2 text-sm text-foreground/75 hover:bg-foreground/5">
              Abbrechen
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                setSaving(true)
                try {
                  await onInvite({ email, role })
                  setEmail("")
                } finally {
                  setSaving(false)
                }
              }}
              className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
            >
              {saving ? "Wird eingeladen..." : "Einladen"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
