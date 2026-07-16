import { createHash } from "crypto"
import { NextResponse } from "next/server"
import { getRouteUser } from "@/lib/supabase/route"

const normalizeCode = (value: string) => value.replace(/[^A-Z0-9]/gi, "").toUpperCase()
const hashCode = (userId: string, code: string) =>
  createHash("sha256").update(`${userId}:${normalizeCode(code)}`).digest("hex")

export async function POST(request: Request) {
  const { supabase, user, error } = await getRouteUser(request)

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const code = typeof body.code === "string" ? body.code.trim() : ""

  if (!code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 })
  }

  const codeHash = hashCode(user.id, code)

  const { data: row, error: queryError } = await supabase
    .from("mfa_recovery_codes")
    .select("id, used_at")
    .eq("user_id", user.id)
    .eq("code_hash", codeHash)
    .limit(1)
    .maybeSingle()

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  if (!row || row.used_at) {
    return NextResponse.json({ error: "Invalid recovery code" }, { status: 400 })
  }

  const { error: updateError } = await supabase
    .from("mfa_recovery_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", row.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
