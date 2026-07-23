import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const getSupabasePublicKey = () => {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!key) {
    throw new Error("Missing Supabase public key. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.")
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