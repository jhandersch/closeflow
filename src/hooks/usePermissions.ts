"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

const ACTIVE_WORKSPACE_STORAGE_KEY =
    "closeflow_active_workspace";

type Permissions = {
    loading: boolean;
    role:
        | "owner"
        | "admin"
        | "member"
        | "viewer"
        | null;
    isPlatformAdmin: boolean;
    workspaceId: string | null;
    canManageWorkspace: boolean;
    canManageBilling: boolean;
};

const defaultPermissions: Permissions = {
    loading: true,
    role: null,
    isPlatformAdmin: false,
    workspaceId: null,
    canManageWorkspace: false,
    canManageBilling: false,
};

export function usePermissions() {
    const [permissions, setPermissions] =
        useState<Permissions>(
            defaultPermissions,
        );

    useEffect(() => {
        const load = async () => {
            try {
                const {
                    data: { session },
                } = await supabase.auth.getSession();

                if (!session) {
                    setPermissions({
                        ...defaultPermissions,
                        loading: false,
                    });
                    return;
                }

                const activeWorkspaceId =
                    window.localStorage.getItem(
                        ACTIVE_WORKSPACE_STORAGE_KEY,
                    );

                const headers: HeadersInit = {
                    Authorization:
                        `Bearer ${session.access_token}`,
                };

                if (activeWorkspaceId) {
                    headers[
                        "x-closeflow-workspace-id"
                    ] = activeWorkspaceId;
                }

                const response = await fetch(
                    "/api/me/permissions",
                    {
                        credentials: "include",
                        headers,
                        cache: "no-store",
                    },
                );

                if (!response.ok) {
                    setPermissions({
                        ...defaultPermissions,
                        loading: false,
                    });
                    return;
                }

                const data =
                    (await response.json()) as Omit<
                        Permissions,
                        "loading"
                    >;

                setPermissions({
                    loading: false,
                    ...data,
                });
            } catch {
                setPermissions({
                    ...defaultPermissions,
                    loading: false,
                });
            }
        };

        void load();

        const handleWorkspaceChange = () => {
            void load();
        };

        window.addEventListener(
            "closeflow-workspace-changed",
            handleWorkspaceChange,
        );

        window.addEventListener(
            "storage",
            handleWorkspaceChange,
        );

        return () => {
            window.removeEventListener(
                "closeflow-workspace-changed",
                handleWorkspaceChange,
            );

            window.removeEventListener(
                "storage",
                handleWorkspaceChange,
            );
        };
    }, []);

    return permissions;
}