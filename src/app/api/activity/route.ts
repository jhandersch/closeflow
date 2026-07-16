import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

export async function POST(request: NextRequest) {
    try {
        const { leadId, action, type } = await request.json()

        const { data: userData } = await supabase.auth.getUser()
        const user = userData.user

        if (!user) {
            return NextResponse.json({ error: "No user" }, { status: 401 })
        }

        const { error } = await supabase.from("activities").insert([
            {
                lead_id: leadId,
                user_id: user.id,
                action,
                type,
            },
        ])

        if (error) {
            throw error
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error(error)

        return NextResponse.json({ error: "Activity failed" }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    try {
        const filter = request.nextUrl.searchParams.get("filter") || "month"
        const { data: userData } = await supabase.auth.getUser()
        const user = userData.user

        if (!user) {
            return NextResponse.json({ error: "No user" }, { status: 401 })
        }

        const now = new Date()
        const from = new Date(now)

        if (filter === "today") {
            from.setHours(0, 0, 0, 0)
        } else if (filter === "week") {
            from.setDate(now.getDate() - 7)
        } else {
            from.setDate(now.getDate() - 30)
        }

        const { data, error } = await supabase
            .from("activities")
            .select("*")
            .eq("user_id", user.id)
            .gte("created_at", from.toISOString())
            .order("created_at", { ascending: false })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(data || [])
    } catch (error) {
        console.error(error)

        return NextResponse.json({ error: "Activity load failed" }, { status: 500 })
    }
}