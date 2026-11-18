import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { getRouteUser } from "@/lib/supabase/route";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { readJsonObject } from "@/lib/requestValidation";
const normalizeCode = (value: string) => value.replace(/[^A-Z0-9]/gi, "").toUpperCase();
const hashCode = (userId: string, code: string) => createHash("sha256").update(`${userId}:${normalizeCode(code)}`).digest("hex");
export async function POST(request: Request) {
    const { supabase, user, error } = await getRouteUser(request);
    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const limited = await checkRateLimit(`security:recovery-verify:${user.id}`, { limit: 10, windowMs: 15 * 60 * 1000 });
    if (!limited.success) return rateLimitResponse(limited);
    const body = await readJsonObject(request);
    if (!body) {
        return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!code) {
        return NextResponse.json({ error: "code is required" }, { status: 400 });
    }
    const codeHash = hashCode(user.id, code);
    const { data: consumed, error: consumeError } = await supabase.rpc(
        "consume_mfa_recovery_code",
        { p_code_hash: codeHash },
    );
    if (consumeError) {
        console.error("MFA RECOVERY CODE CONSUME ERROR:", consumeError.message);
        return NextResponse.json({ error: "Could not verify recovery code" }, { status: 500 });
    }
    if (consumed !== true) {
        return NextResponse.json({ error: "Invalid recovery code" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
}
