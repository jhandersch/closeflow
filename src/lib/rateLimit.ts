import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type RateLimitEntry = {
    count: number;
    resetAt: number;
};
const store = new Map<string, RateLimitEntry>();
type RateLimitOptions = {
    limit: number;
    windowMs: number;
};
export type RateLimitResult = {
    success: boolean;
    remaining: number;
    resetAt: number;
};

// Per-instance fallback, used only when the shared limiter is unavailable.
export function rateLimit(key: string, options: RateLimitOptions): RateLimitResult {
    const now = Date.now();
    const existing = store.get(key);
    if (!existing || existing.resetAt <= now) {
        const entry = {
            count: 1,
            resetAt: now + options.windowMs,
        };
        store.set(key, entry);
        return {
            success: true,
            remaining: options.limit - 1,
            resetAt: entry.resetAt,
        };
    }
    if (existing.count >= options.limit) {
        return {
            success: false,
            remaining: 0,
            resetAt: existing.resetAt,
        };
    }
    existing.count += 1;
    return {
        success: true,
        remaining: options.limit - existing.count,
        resetAt: existing.resetAt,
    };
}

/**
 * Shared limiter backed by Postgres (works across serverless instances).
 * Falls back to the in-memory limiter if the database call fails, so an
 * outage of the limiter never blocks legitimate traffic.
 */
export async function checkRateLimit(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRole) {
        return rateLimit(key, options);
    }
    try {
        const admin = createClient(url, serviceRole, {
            auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data, error } = await admin.rpc("check_rate_limit", {
            p_key: key,
            p_limit: options.limit,
            p_window_seconds: Math.max(1, Math.ceil(options.windowMs / 1000)),
        });
        const row = Array.isArray(data) ? data[0] : data;
        if (error || !row) {
            console.error("Shared rate limiter unavailable:", error?.message ?? "empty result");
            return rateLimit(key, options);
        }
        return {
            success: Boolean(row.is_allowed),
            remaining: Number(row.remaining_count) || 0,
            resetAt: new Date(row.reset_at).getTime(),
        };
    }
    catch (error) {
        console.error("Shared rate limiter failed:", error);
        return rateLimit(key, options);
    }
}

export function rateLimitResponse(result: RateLimitResult) {
    return NextResponse.json(
        { error: "Too many requests. Please wait a moment and try again." },
        {
            status: 429,
            headers: {
                "Retry-After": String(Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))),
            },
        },
    );
}

export function getClientIp(request: Request) {
    const forwarded = request.headers.get("x-forwarded-for");
    return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}
