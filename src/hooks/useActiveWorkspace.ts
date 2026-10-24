"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "closeflow_active_workspace";

function persistWorkspace(workspaceId: string) {
    window.localStorage.setItem(STORAGE_KEY, workspaceId);
    document.cookie = `${STORAGE_KEY}=${encodeURIComponent(workspaceId)}; path=/; max-age=31536000; SameSite=Lax; Secure`;
}

export function useActiveWorkspace(
    availableWorkspaceIds: string[],
) {
    const [activeWorkspaceId, setActiveWorkspaceId] =
        useState<string | null>(null);

    useEffect(() => {
        const stored = window.localStorage.getItem(
            STORAGE_KEY,
        );

        if (
            stored &&
            availableWorkspaceIds.includes(stored)
        ) {
            setActiveWorkspaceId(stored);
            persistWorkspace(stored);
            return;
        }

        if (availableWorkspaceIds.length > 0) {
            const first = availableWorkspaceIds[0];

            setActiveWorkspaceId(first);
            persistWorkspace(first);
        }
    }, [availableWorkspaceIds.join("|")]);

    const selectWorkspace = (workspaceId: string) => {
    if (
        !availableWorkspaceIds.includes(
            workspaceId,
        )
    ) {
        return;
    }

    setActiveWorkspaceId(workspaceId);

    persistWorkspace(workspaceId);

    window.dispatchEvent(
        new Event(
            "closeflow-workspace-changed",
        ),
    );
};

    return {
        activeWorkspaceId,
        selectWorkspace,
    };
}