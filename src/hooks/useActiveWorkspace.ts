"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "closeflow_active_workspace";

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
            return;
        }

        if (availableWorkspaceIds.length > 0) {
            const first = availableWorkspaceIds[0];

            setActiveWorkspaceId(first);
            window.localStorage.setItem(
                STORAGE_KEY,
                first,
            );
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

    window.localStorage.setItem(
        STORAGE_KEY,
        workspaceId,
    );

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