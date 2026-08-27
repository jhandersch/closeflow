import { NextResponse, type NextRequest } from "next/server"
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


export async function middleware(request: NextRequest) {

  let response = NextResponse.next({
    request,
  })


  const supabase = createServerClient(
    supabaseUrl,
    getSupabasePublicKey(),
    {
      cookies: {

        get(name: string) {
          return request.cookies.get(name)?.value
        },

        set(name: string, value: string, options) {
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },

        remove(name: string, options) {
          response.cookies.set({
            name,
            value: "",
            ...options,
          })
        },

      },
    }
  )


  await supabase.auth.getUser()


  return response

}


export const config = {
  matcher:[
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}