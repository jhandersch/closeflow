import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabasePublicKey = (publishableKey?.startsWith("sb_secret_") ? anonKey : publishableKey) || anonKey

if (!supabasePublicKey) {
  throw new Error("Missing Supabase public key. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.")
}

if (supabasePublicKey.startsWith("sb_secret_")) {
  throw new Error("Invalid Supabase public key. Use NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY, never an sb_secret key.")
}

export const supabase = createBrowserClient(
  supabaseUrl,
  supabasePublicKey
)