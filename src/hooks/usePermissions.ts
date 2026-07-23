"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"


type Permissions = {
  loading: boolean
  role: "owner" | "admin" | "member" | null
  isPlatformAdmin: boolean
  canManageWorkspace: boolean
  canManageBilling: boolean
}


const defaultPermissions: Permissions = {
  loading: true,
  role: null,
  isPlatformAdmin: false,
  canManageWorkspace: false,
  canManageBilling: false,
}


export function usePermissions() {

  const [permissions, setPermissions] =
    useState<Permissions>(defaultPermissions)


  useEffect(() => {

    const load = async () => {
      try {
        const {
          data: {
            session,
          },
        } = await supabase.auth.getSession()

        if (!session) {
          setPermissions({
            ...defaultPermissions,
            loading: false,
          })
          return
        }


        const response = await fetch(
          "/api/me/permissions",
          {
            credentials: "include",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        )


        if (!response.ok) {

          setPermissions({
            ...defaultPermissions,
            loading: false,
          })

          return
        }


        const data = (await response.json()) as Omit<Permissions, "loading">


        setPermissions({
          loading: false,
          ...data,
        })
      } catch {
        setPermissions({
          ...defaultPermissions,
          loading: false,
        })
      }

    }


    void load()


  }, [])


  return permissions
}