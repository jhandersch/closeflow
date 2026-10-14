export type UsageBucket = "ai" | "export";

export type UsageQuotaResult =
    | {
          ok: true;
          currentCount: number;
          limit: number;
          plan: "free" | "pro" | "business";
          alreadyCounted: boolean;
      }
    | {
          ok: false;
          status: 429 | 503;
          message: string;
      };

type RpcClient = {
    rpc: (
        functionName: string,
        args: Record<string, unknown>,
    ) => PromiseLike<{
        data: unknown;
        error: { message?: string } | null;
    }>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

export async function consumeWorkspaceUsage(
    supabase: RpcClient,
    workspaceId: string,
    bucket: UsageBucket,
    requestKey: string,
    month = new Date().toISOString().slice(0, 7),
): Promise<UsageQuotaResult> {
    try {
        const { data, error } = await supabase.rpc("consume_workspace_usage", {
            p_workspace_id: workspaceId,
            p_month: month,
            p_bucket: bucket,
            p_request_key: requestKey,
        });

        if (error) {
            console.error("Workspace usage reservation failed:", error.message);
            return {
                ok: false,
                status: 503,
                message: "Could not verify workspace usage. Please try again later.",
            };
        }

        const row = Array.isArray(data) ? data[0] : data;
        if (
            !isRecord(row) ||
            typeof row.allowed !== "boolean" ||
            typeof row.current_count !== "number" ||
            typeof row.usage_limit !== "number" ||
            (row.plan !== "free" && row.plan !== "pro" && row.plan !== "business") ||
            typeof row.already_counted !== "boolean"
        ) {
            console.error("Workspace usage reservation returned an invalid response.");
            return {
                ok: false,
                status: 503,
                message: "Could not verify workspace usage. Please try again later.",
            };
        }

        if (!row.allowed) {
            return {
                ok: false,
                status: 429,
                message: `${bucket === "ai" ? "AI request" : "Export"} limit reached for ${row.plan.toUpperCase()} plan (${row.usage_limit}/${row.usage_limit}).`,
            };
        }

        return {
            ok: true,
            currentCount: row.current_count,
            limit: row.usage_limit,
            plan: row.plan,
            alreadyCounted: row.already_counted,
        };
    } catch (error) {
        console.error(
            "Workspace usage reservation threw:",
            error instanceof Error ? error.message : "Unknown error",
        );
        return {
            ok: false,
            status: 503,
            message: "Could not verify workspace usage. Please try again later.",
        };
    }
}
