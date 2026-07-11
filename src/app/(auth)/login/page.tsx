"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        router.replace("/dashboard")
      }
    }

    checkUser()
  }, [router])

  const login = async () => {
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (!error) {
      router.replace("/dashboard")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="bg-[#111] p-6 rounded-xl w-80">
        <h1 className="text-2xl font-bold mb-6">Login</h1>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full mb-3 px-3 py-2 rounded-lg bg-black border border-white/10"
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full mb-4 px-3 py-2 rounded-lg bg-black border border-white/10"
        />

        <button
          onClick={login}
          disabled={loading}
          className="w-full bg-white text-black py-2 rounded-lg"
        >
          {loading ? "Loading..." : "Login"}
        </button>
      </div>
    </div>
  )
}