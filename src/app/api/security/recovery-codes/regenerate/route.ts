import { createHash, randomBytes } from "crypto"
import { NextResponse } from "next/server"
import { getRouteUser } from "@/lib/supabase/route"

const normalizeCode = (value: string) => value.replace(/[^A-Z0-9]/gi, "").toUpperCase()
const hashCode = (userId: string, code: string) =>
  createHash("sha256").update(`${userId}:${normalizeCode(code)}`).digest("hex")

const generateCode = () => {
  const raw = randomBytes(5).toString("hex").toUpperCase().slice(0, 10)
  return `${raw.slice(0, 5)}-${raw.slice(5, 10)}`
}

export async function POST(request: Request) {
  const { supabase, user, error } = await getRouteUser(request)

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const codes = Array.from({ length: 8 }).map(() => generateCode())
  const rows = codes.map((code) => ({ user_id: user.id, code_hash: hashCode(user.id, code) }))

  const { error: deleteError } = await supabase.from("mfa_recovery_codes").delete().eq("user_id", user.id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  const { error: insertError } = await supabase.from("mfa_recovery_codes").insert(rows)

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  await supabase.auth.updateUser({
    data: {
      has_recovery_codes: true,
      recovery_codes_generated_at: new Date().toISOString(),
    },
  })

  return NextResponse.json({ codes })
}
