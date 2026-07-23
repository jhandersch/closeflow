import { NextResponse } from "next/server"
import { getRouteUser } from "@/lib/supabase/route"

const isAdminEmail = (email: string | null | undefined) => {
  if (!email) return false

  const admins = (process.env.CLOSEFLOW_ADMIN_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)

  return admins.includes(email.toLowerCase())
}

export async function GET(request: Request) {
  const {
    supabase,
    user,
    error,
  } = await getRouteUser(request)

  if (error || !user) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    )
  }


  const {
    data: membership,
    error: membershipError,
  } = await supabase
    .from("organization_members")
    .select("*")
    .eq("member_user_id", user.id)
    .maybeSingle()


  if (membershipError) {
    return NextResponse.json(
      {
        error: "Membership lookup failed",
      },
      {
        status: 500,
      }
    )
  }


  const role = membership?.role ?? null


  return NextResponse.json({

    role,

    organizationId:
      membership?.organization_id ?? null,

    isPlatformAdmin:
      isAdminEmail(user.email),

    canManageWorkspace:
      role === "Owner" ||
      role === "Admin",

    canManageBilling:
      role === "Owner",

  })
}