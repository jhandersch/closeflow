import { supabase } from "@/lib/supabase/client"

type DemoSeedResponse = {
  mode: "load" | "reload"
  inserted_leads: number
  inserted_activities: number
  inserted_tasks: number
  skipped: number
  message: string
  warnings?: string[]
}

type LoadDemoOptions = {
  reload?: boolean
}

export async function loadDemoData(options: LoadDemoOptions = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error("You need an active session to load demo data.")
  }

  const response = await fetch("/api/demo/seed", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ mode: options.reload ? "reload" : "load" }),
  })

  const payload = (await response.json().catch(() => null)) as DemoSeedResponse | { error?: string } | null

  if (!response.ok) {
    throw new Error(payload && "error" in payload && payload.error ? payload.error : "Failed to load demo data")
  }

  if (!payload || !("message" in payload)) {
    throw new Error("Demo response was invalid")
  }

  return payload
}
