import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
const REQUIRED_ENV = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "OPENAI_API_KEY",
    "CRON_SECRET",
];
async function checkDatabase() {
    try {
        const admin = createAdminClient();
        const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 4000));
        const query = admin.from("workspaces").select("id", { head: true, count: "exact" }).limit(1);
        const result = await Promise.race([query, timeout]);
        return !result.error;
    }
    catch {
        return false;
    }
}
// Public endpoint: reports only pass/fail per check, never values or error details.
export async function GET() {
    const database = await checkDatabase();
    const config = REQUIRED_ENV.every((name) => Boolean(process.env[name]));
    const ok = database && config;
    return NextResponse.json({
        status: ok ? "ok" : "degraded",
        service: "closeflow",
        version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
        checks: { database: database ? "ok" : "fail", config: config ? "ok" : "fail" },
        timestamp: new Date().toISOString(),
    }, { status: ok ? 200 : 503 });
}
