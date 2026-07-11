"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"

export default function SettingsPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setEmail(user.email || "")
      }

      setLoading(false)
    }

    loadUser()
  }, [])

  if (loading) {
    return <div className="text-white">Loading settings...</div>
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">
        Settings
      </h1>

      <div className="bg-[#111] p-6 rounded-xl max-w-xl">
        <h2 className="text-xl font-semibold mb-4">
          Profile
        </h2>

        <div>
          <p className="text-zinc-400 text-sm">
            Email
          </p>

          <div className="mt-2 bg-black border border-white/10 rounded-lg p-3">
            {email}
          </div>
        </div>
      </div>
    </div>
  )
}