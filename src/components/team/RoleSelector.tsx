"use client";
import type { WorkspaceRole } from "@/types";
type RoleSelectorProps = {
    value: WorkspaceRole;
    onChange: (role: WorkspaceRole) => void;
    disabled?: boolean;
};
const roleOptions: Array<{
    value: WorkspaceRole;
    label: string;
}> = [
    { value: "owner", label: "Owner" },
    { value: "admin", label: "Admin" },
    { value: "member", label: "Member" },
    { value: "viewer", label: "Viewer" },
];
export default function RoleSelector({ value, onChange, disabled }: RoleSelectorProps) {
    return (<select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value as WorkspaceRole)} className="rounded-xl border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-cyan-400 disabled:opacity-60">
      {roleOptions.map((role) => (<option key={role.value} value={role.value}>
          {role.label}
        </option>))}
    </select>);
}
