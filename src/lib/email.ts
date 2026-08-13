import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

type SendInviteEmailParams = {
  to: string
  inviteUrl: string
  workspaceName?: string
}

export async function sendWorkspaceInviteEmail({
  to,
  inviteUrl,
  workspaceName = "CloseFlow",
}: SendInviteEmailParams) {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is missing")
  }

  const { data, error } = await resend.emails.send({
    from: "CloseFlow <onboarding@resend.dev>",
    to,
    subject: `You're invited to join ${workspaceName}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>You're invited to join ${workspaceName}</h2>

        <p>
          You have been invited to join a workspace on CloseFlow.
        </p>

        <p>
          Click the button below to accept the invitation:
        </p>

        <p>
          <a
            href="${inviteUrl}"
            style="
              display: inline-block;
              padding: 12px 20px;
              background: #111827;
              color: white;
              text-decoration: none;
              border-radius: 8px;
            "
          >
            Accept invitation
          </a>
        </p>

        <p style="color: #666; font-size: 14px;">
          This invitation expires in 7 days.
        </p>

        <p style="color: #666; font-size: 12px;">
          If you did not expect this invitation, you can safely ignore this email.
        </p>
      </div>
    `,
  })

if (error) {
  console.error("RESEND ERROR FULL:", JSON.stringify(error, null, 2))
  throw new Error(error.message)
}

  return data
}