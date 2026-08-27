import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const getSupabasePublicKey = () => {
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const key = (publishableKey?.startsWith("sb_secret_") ? anonKey : publishableKey) || anonKey

  if (!key) {
    throw new Error("Missing Supabase public key. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.")
  }

  if (key.startsWith("sb_secret_")) {
    throw new Error("Invalid Supabase public key. Use NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY, never an sb_secret key.")
  }

  return key
}


export async function createClient() {

  const cookieStore = await cookies()


  return createServerClient(
    supabaseUrl,
    getSupabasePublicKey(),
    {
      cookies: {

        get(name: string) {

          return cookieStore.get(name)?.value

        },

        set(
          name: string,
          value: string,
          options
        ) {

          try {
            cookieStore.set({
              name,
              value,
              ...options,
            })

          } catch {

          }

        },

        remove(
          name: string,
          options
        ) {

          try {
            cookieStore.set({
              name,
              value: "",
              ...options,
            })
          } catch {

          }

        }

      },
    }
  )
}