"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabase/client";

type AdminOverview = {
    users: number;
    workspaces: number;
    leads: number;
    mrr: number;
    ai_requests: number;
    errors_24h: number;
    ai_cost_30d_usd: number;
    ai_tokens_30d: number;
};

type AdminUser = {
    id: string;
    email: string | null;
    created_at: string;
    last_sign_in_at: string | null;
    email_confirmed_at: string | null;
    banned_until: string | null;
    user_metadata: {
        name: string | null;
        username: string | null;
        company_name: string | null;
    };
    is_platform_admin: boolean;
};

export default function AdminPage() {
    const [overview, setOverview] = useState<AdminOverview | null>(null);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [usersLoading, setUsersLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [usersError, setUsersError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setUsersLoading(true);
            setError(null);
            setUsersError(null);

            const {
                data: { session },
            } = await supabase.auth.getSession();

            const headers: Record<string, string> = {};

            if (session?.access_token) {
                headers.Authorization = `Bearer ${session.access_token}`;
            }

            const [overviewResponse, usersResponse] = await Promise.all([
                fetch("/api/admin/overview", {
                    headers,
                    credentials: "include",
                }),
                fetch("/api/admin/users", {
                    headers,
                    credentials: "include",
                }),
            ]);

            if (!overviewResponse.ok) {
                let message = "Could not load admin overview";

                try {
                    const data = (await overviewResponse.json()) as {
                        error?: string;
                    };

                    message = data.error || message;
                } catch {
                    const text = await overviewResponse.text();
                    message = text || message;
                }

                setError(message);
            } else {
                setOverview(
                    (await overviewResponse.json()) as AdminOverview
                );
            }

            setLoading(false);

            if (!usersResponse.ok) {
                let message = "Could not load users";

                try {
                    const data = (await usersResponse.json()) as {
                        error?: string;
                    };

                    message = data.error || message;
                } catch {
                    const text = await usersResponse.text();
                    message = text || message;
                }

                setUsersError(message);
            } else {
                const data = (await usersResponse.json()) as {
                    users: AdminUser[];
                };

                setUsers(data.users || []);
            }

            setUsersLoading(false);
        };

        void load();
    }, []);

    return (
        <AuthGuard>
            <div className="mx-auto max-w-6xl space-y-8">
                <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">
                        Admin
                    </p>

                    <h1 className="mt-2 text-3xl font-bold text-foreground">
                        Platform Overview
                    </h1>

                    <p className="mt-2 text-sm text-foreground/65">
                        Monitor global usage, growth, users and AI demand
                        across all workspaces.
                    </p>
                </div>

                {loading ? (
                    <p className="text-sm text-foreground/60">
                        Loading admin metrics...
                    </p>
                ) : null}

                {error ? (
                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                        <p>{error}</p>

                        {error
                            .toLowerCase()
                            .includes(
                                "two-factor authentication required"
                            ) ? (
                            <p className="mt-2">
                                Enable 2FA first in{" "}
                                <Link
                                    href="/settings#security"
                                    className="text-cyan-200 underline"
                                >
                                    Settings -&gt; Security
                                </Link>
                                .
                            </p>
                        ) : null}
                    </div>
                ) : null}

                {overview ? (
                    <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-8">
                        <Stat
                            label="Users"
                            value={String(overview.users)}
                        />

                        <Stat
                            label="Workspaces"
                            value={String(overview.workspaces)}
                        />

                        <Stat
                            label="Leads"
                            value={String(overview.leads)}
                        />

                        <Stat
                            label="MRR"
                            value={`€${overview.mrr}`}
                        />

                        <Stat
                            label="AI Requests"
                            value={String(overview.ai_requests)}
                        />

                        <Stat
                            label="Errors (24h)"
                            value={String(overview.errors_24h)}
                        />

                        <Stat
                            label="AI Cost (30d)"
                            value={`$${overview.ai_cost_30d_usd.toFixed(2)}`}
                        />

                        <Stat
                            label="AI Tokens (30d)"
                            value={String(overview.ai_tokens_30d)}
                        />
                    </div>
                ) : null}

                <section className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-cyan-400">
                                User Management
                            </p>

                            <h2 className="mt-1 text-xl font-semibold text-foreground">
                                Registered Users
                            </h2>

                            <p className="mt-1 text-sm text-foreground/60">
                                Platform-wide user accounts and authentication
                                status.
                            </p>
                        </div>

                        {!usersLoading ? (
                            <span className="text-sm text-foreground/50">
                                {users.length} users
                            </span>
                        ) : null}
                    </div>

                    {usersLoading ? (
                        <p className="mt-6 text-sm text-foreground/60">
                            Loading users...
                        </p>
                    ) : null}

                    {usersError ? (
                        <div className="mt-6 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                            {usersError}
                        </div>
                    ) : null}

                    {!usersLoading && !usersError ? (
                        <div className="mt-6 overflow-x-auto">
                            <table className="w-full min-w-[850px] text-left text-sm">
                                <thead>
                                    <tr className="border-b border-border-subtle text-xs uppercase tracking-[0.14em] text-foreground/45">
                                        <th className="px-3 py-3 font-medium">
                                            User
                                        </th>
                                        <th className="px-3 py-3 font-medium">
                                            Company
                                        </th>
                                        <th className="px-3 py-3 font-medium">
                                            Created
                                        </th>
                                        <th className="px-3 py-3 font-medium">
                                            Last Sign In
                                        </th>
                                        <th className="px-3 py-3 font-medium">
                                            Email
                                        </th>
                                        <th className="px-3 py-3 font-medium">
                                            Role
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {users.map((user) => (
                                        <tr
                                            key={user.id}
                                            className="border-b border-border-subtle/60 last:border-0"
                                        >
                                            <td className="px-3 py-4">
                                                <div>
                                                    <p className="font-medium text-foreground">
                                                        {user.user_metadata
                                                            .name ||
                                                            user.user_metadata
                                                                .username ||
                                                            "Unnamed user"}
                                                    </p>

                                                    <p className="mt-1 text-xs text-foreground/45">
                                                        {user.email ||
                                                            "No email"}
                                                    </p>
                                                </div>
                                            </td>

                                            <td className="px-3 py-4 text-foreground/65">
                                                {user.user_metadata
                                                    .company_name || "—"}
                                            </td>

                                            <td className="px-3 py-4 text-foreground/65">
                                                {formatDate(user.created_at)}
                                            </td>

                                            <td className="px-3 py-4 text-foreground/65">
                                                {user.last_sign_in_at
                                                    ? formatDate(
                                                          user.last_sign_in_at
                                                      )
                                                    : "Never"}
                                            </td>

                                            <td className="px-3 py-4">
                                                {user.email_confirmed_at ? (
                                                    <StatusBadge type="success">
                                                        Confirmed
                                                    </StatusBadge>
                                                ) : (
                                                    <StatusBadge type="warning">
                                                        Unconfirmed
                                                    </StatusBadge>
                                                )}
                                            </td>

                                            <td className="px-3 py-4">
                                                {user.is_platform_admin ? (
                                                    <StatusBadge type="admin">
                                                        Platform Admin
                                                    </StatusBadge>
                                                ) : (
                                                    <StatusBadge type="neutral">
                                                        User
                                                    </StatusBadge>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {users.length === 0 ? (
                                <p className="py-8 text-center text-sm text-foreground/50">
                                    No users found.
                                </p>
                            ) : null}
                        </div>
                    ) : null}
                </section>

                <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5 text-sm text-foreground/75">
                    Detailed workspace error log is available at{" "}
                    <Link
                        href="/settings/monitoring"
                        className="text-cyan-300 underline"
                    >
                        /settings/monitoring
                    </Link>
                    .
                </div>
            </div>
        </AuthGuard>
    );
}

function Stat({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
            <p className="text-xs text-foreground/60">{label}</p>

            <p className="mt-2 text-2xl font-semibold text-foreground">
                {value}
            </p>
        </div>
    );
}

function StatusBadge({
    children,
    type,
}: {
    children: React.ReactNode;
    type: "success" | "warning" | "admin" | "neutral";
}) {
    const classes = {
        success:
            "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
        warning:
            "border-amber-500/20 bg-amber-500/10 text-amber-300",
        admin:
            "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
        neutral:
            "border-border-subtle bg-surface-2 text-foreground/60",
    };

    return (
        <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${classes[type]}`}
        >
            {children}
        </span>
    );
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}