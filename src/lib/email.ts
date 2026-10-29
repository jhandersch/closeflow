import { translateText } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/i18n";
import { buildInviteEmail } from "@/lib/email-templates";
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
    const { subject, html } = buildInviteEmail(language === "de" ? "de" : "en", { workspaceName, inviteUrl });
    const { data, error } = await resend.emails.send({
        from: process.env.EMAIL_FROM || "CloseFlow <onboarding@resend.dev>",
        to,
        subject,
        html,
    });
    if (error) {
        console.error("RESEND ERROR FULL:", JSON.stringify(error, null, 2));
        throw new Error(error.message);
    }
    return data;
}
