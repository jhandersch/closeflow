import { createClient } from "@supabase/supabase-js"
import FeedbackForm from "./FeedbackForm"

type Props = {
  params: Promise<{ workspaceId: string }>
}

export default async function FeedbackPage({ params }: Props) {
  const { workspaceId } = await params

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

  let companyName: string | undefined

  if (url && serviceRole) {
    const admin = createClient(url, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data } = await admin
      .from("workspaces")
      .select("name")
      .eq("id", workspaceId)
      .maybeSingle()

    companyName = data?.name || undefined
  }

  return <FeedbackForm workspaceId={workspaceId} companyName={companyName} />
}