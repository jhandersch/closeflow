import { translateText } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/i18n";
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);
type SendInviteEmailParams = {
    to: string;
    inviteUrl: string;
    workspaceName?: string;
    language?: AppLanguage;
};
export async function sendWorkspaceInviteEmail({ to, inviteUrl, workspaceName = "CloseFlow", language = "en", }: SendInviteEmailParams) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        throw new Error(translateText("RESEND_API_KEY is missing"));
    }
    const german = language === "de";
    const subject = german
        ? `Du wurdest eingeladen, ${workspaceName} beizutreten`
        : `You're invited to join ${workspaceName}`;
    const { data, error } = await resend.emails.send({
        from: process.env.EMAIL_FROM || "CloseFlow <onboarding@resend.dev>",
        to,
        subject,
        html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>${subject}</h2>

        <p>
          ${german ? "Du wurdest eingeladen, einem Arbeitsbereich in CloseFlow beizutreten." : "You have been invited to join a workspace on CloseFlow."}
        </p>

        <p>
          ${german ? "Klicke unten, um die Einladung anzunehmen:" : "Click the button below to accept the invitation:"}
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
            ${german ? "Einladung annehmen" : "Accept invitation"}
          </a>
        </p>

        <p style="color: #666; font-size: 14px;">
          ${german ? "Diese Einladung läuft in 7 Tagen ab." : "This invitation expires in 7 days."}
        </p>

        <p style="color: #666; font-size: 12px;">
          ${german ? "Wenn du diese Einladung nicht erwartet hast, kannst du diese E-Mail ignorieren." : "If you did not expect this invitation, you can safely ignore this email."}
        </p>
      </div>
    `,
    });
    if (error) {
        console.error("RESEND ERROR FULL:", JSON.stringify(error, null, 2));
        throw new Error(error.message);
    }
    return data;
}
