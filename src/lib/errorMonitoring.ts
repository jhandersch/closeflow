import type { SupabaseClient } from "@supabase/supabase-js"
import { loadWorkspaceForUser } from "@/lib/supabase/route"

export type ErrorLevel = "error" | "warning" | "info"
export type ErrorSource = "client" | "server" | "api"

type ErrorCaptureInput = {
  level?: ErrorLevel
  source?: ErrorSource
  message: string
  stack?: string | null
  digest?: string | null
  pathname?: string | null
  details?: Record<string, unknown> | null
}

type AuditRow = {
  id: string
  actor_user_id: string | null
  event_type: string
  payload: Record<string, unknown> | null
  created_at: string
}

const isMissingRelation = (message: string) => /relation .* does not exist|schema cache/i.test(message)

const sanitizeText = (value: unknown, max = 2000) => {
  const text = typeof value === "string" ? value.trim() : ""
  return text.length > max ? text.slice(0, max) : text
}

export async function captureWorkspaceError(
  supabase: SupabaseClient,
  userId: string,
  input: ErrorCaptureInput
): Promise<boolean> {
  const { workspace, error } = await loadWorkspaceForUser(supabase, userId)

  if (error || !workspace) {
    return false
  }

  const payload: Record<string, unknown> = {
    level: input.level || "error",
    source: input.source || "server",
    message: sanitizeText(input.message, 600),
    stack: sanitizeText(input.stack, 6000),
    digest: sanitizeText(input.digest, 200),
    pathname: sanitizeText(input.pathname, 500),
    details: input.details || {},
    captured_at: new Date().toISOString(),
  }

  const { error: insertError } = await supabase.from("audit_logs").insert({
    workspace_id: workspace.id,
    actor_user_id: userId,
    event_type: `error.${payload.source}`,
    payload,
  })

  if (!insertError) {
    return true
  }

  if (isMissingRelation(insertError.message || "")) {
    return false
  }

  return false
}

export async function listWorkspaceErrors(
  supabase: SupabaseClient,
  workspaceId: string,
  limit: number
): Promise<AuditRow[]> {
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.floor(limit), 1), 200) : 50

  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, actor_user_id, event_type, payload, created_at")
    .eq("workspace_id", workspaceId)
    .ilike("event_type", "error.%")
    .order("created_at", { ascending: false })
    .limit(safeLimit)

  if (error) {
    return []
  }

  return (data || []) as AuditRow[]
}
