export type EmailLanguage = "de" | "en";

export type EmailContent = {
    title: string;
    paragraphs: string[];
    cta?: { label: string; url: string };
    note?: string;
    footer: string;
};

// CloseFlow dark theme (see globals.css): background #090d12, accent #38bdf8.
const colors = {
    page: "#090d12",
    card: "#111823",
    border: "#243044",
    text: "#e8edf4",
    muted: "#94a3b8",
    accent: "#38bdf8",
    accentText: "#04121c",
};

const fontStack = "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif";

export const escapeHtml = (value: string): string =>
    value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

// Text is expected to be pre-escaped; urls are inserted as given so template placeholders still work.
export const renderEmailHtml = (language: EmailLanguage, content: EmailContent): string => {
    const paragraphs = content.paragraphs
        .map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${colors.text};">${p}</p>`)
        .join("");
    const cta = content.cta
        ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="border-radius:10px;background:${colors.accent};"><a href="${content.cta.url}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:600;color:${colors.accentText};text-decoration:none;border-radius:10px;">${content.cta.label}</a></td></tr></table>`
        : "";
    const note = content.note
        ? `<p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:${colors.muted};">${content.note}</p>`
        : "";

    return `<!DOCTYPE html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>${content.title}</title>
</head>
<body style="margin:0;padding:0;background:${colors.page};font-family:${fontStack};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${colors.page};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="padding:0 0 20px;font-size:22px;font-weight:700;letter-spacing:-0.01em;color:${colors.text};">Close<span style="color:${colors.accent};">Flow</span></td></tr>
<tr><td style="background:${colors.card};border:1px solid ${colors.border};border-radius:16px;padding:32px;">
<h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;color:${colors.text};">${content.title}</h1>
${paragraphs}${cta}${note}
</td></tr>
<tr><td style="padding:20px 8px 0;font-size:12px;line-height:1.5;color:${colors.muted};">${content.footer}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
`;
};

const footers: Record<EmailLanguage, string> = {
    de: "Diese Nachricht wurde automatisch von CloseFlow versendet. Bitte antworten Sie nicht auf diese E-Mail.",
    en: "This message was sent automatically by CloseFlow. Please do not reply to this email.",
};

export const buildInviteEmail = (
    language: EmailLanguage,
    params: { workspaceName: string; inviteUrl: string },
): { subject: string; html: string } => {
    const name = escapeHtml(params.workspaceName);
    const url = escapeHtml(params.inviteUrl);
    if (language === "de") {
        const subject = `Sie wurden eingeladen, ${params.workspaceName} beizutreten`;
        return {
            subject,
            html: renderEmailHtml("de", {
                title: "Einladung zu CloseFlow",
                paragraphs: [`Sie wurden eingeladen, dem Arbeitsbereich <strong>${name}</strong> in CloseFlow beizutreten.`],
                cta: { label: "Einladung annehmen", url },
                note: "Diese Einladung läuft in 7 Tagen ab. Wenn Sie diese Einladung nicht erwartet haben, können Sie diese E-Mail ignorieren.",
                footer: footers.de,
            }),
        };
    }
    return {
        subject: `You're invited to join ${params.workspaceName}`,
        html: renderEmailHtml("en", {
            title: "You're invited to CloseFlow",
            paragraphs: [`You have been invited to join the workspace <strong>${name}</strong> on CloseFlow.`],
            cta: { label: "Accept invitation", url },
            note: "This invitation expires in 7 days. If you did not expect this invitation, you can safely ignore this email.",
            footer: footers.en,
        }),
    };
};

type AuthTemplateKind = "confirmation" | "recovery" | "magic_link" | "email_change";

// Supabase Auth templates are rendered by Go templates; the language comes from user_metadata.language.
const authContent: Record<AuthTemplateKind, { url: string; de: Omit<EmailContent, "footer">; en: Omit<EmailContent, "footer"> }> = {
    confirmation: {
        url: "{{ .ConfirmationURL }}",
        de: {
            title: "E-Mail-Adresse bestätigen",
            paragraphs: ["Willkommen bei CloseFlow! Bitte bestätigen Sie Ihre E-Mail-Adresse, um Ihr Konto zu aktivieren."],
            cta: { label: "E-Mail bestätigen", url: "" },
            note: "Wenn Sie kein Konto erstellt haben, können Sie diese E-Mail ignorieren.",
        },
        en: {
            title: "Confirm your email address",
            paragraphs: ["Welcome to CloseFlow! Please confirm your email address to activate your account."],
            cta: { label: "Confirm email", url: "" },
            note: "If you did not create an account, you can safely ignore this email.",
        },
    },
    recovery: {
        url: "{{ .ConfirmationURL }}",
        de: {
            title: "Passwort zurücksetzen",
            paragraphs: ["Wir haben eine Anfrage erhalten, das Passwort für Ihr CloseFlow-Konto zurückzusetzen."],
            cta: { label: "Neues Passwort festlegen", url: "" },
            note: "Wenn Sie dies nicht angefordert haben, können Sie diese E-Mail ignorieren. Ihr Passwort bleibt unverändert.",
        },
        en: {
            title: "Reset your password",
            paragraphs: ["We received a request to reset the password for your CloseFlow account."],
            cta: { label: "Set a new password", url: "" },
            note: "If you did not request this, you can safely ignore this email. Your password will stay the same.",
        },
    },
    magic_link: {
        url: "{{ .ConfirmationURL }}",
        de: {
            title: "Bei CloseFlow anmelden",
            paragraphs: ["Klicken Sie auf die Schaltfläche, um sich bei CloseFlow anzumelden."],
            cta: { label: "Anmelden", url: "" },
            note: "Wenn Sie dies nicht angefordert haben, können Sie diese E-Mail ignorieren.",
        },
        en: {
            title: "Sign in to CloseFlow",
            paragraphs: ["Click the button below to sign in to CloseFlow."],
            cta: { label: "Sign in", url: "" },
            note: "If you did not request this, you can safely ignore this email.",
        },
    },
    email_change: {
        url: "{{ .ConfirmationURL }}",
        de: {
            title: "Neue E-Mail-Adresse bestätigen",
            paragraphs: ["Bitte bestätigen Sie die Änderung Ihrer E-Mail-Adresse für CloseFlow auf {{ .NewEmail }}."],
            cta: { label: "Änderung bestätigen", url: "" },
            note: "Wenn Sie diese Änderung nicht angefordert haben, wenden Sie sich bitte umgehend an den Support.",
        },
        en: {
            title: "Confirm your new email address",
            paragraphs: ["Please confirm the change of your CloseFlow email address to {{ .NewEmail }}."],
            cta: { label: "Confirm change", url: "" },
            note: "If you did not request this change, please contact support immediately.",
        },
    },
};

const subjects: Record<AuthTemplateKind, Record<EmailLanguage, string>> = {
    confirmation: { de: "Bestätigen Sie Ihre E-Mail-Adresse für CloseFlow", en: "Confirm your email for CloseFlow" },
    recovery: { de: "CloseFlow-Passwort zurücksetzen", en: "Reset your CloseFlow password" },
    magic_link: { de: "Ihr CloseFlow-Anmeldelink", en: "Your CloseFlow sign-in link" },
    email_change: { de: "Neue E-Mail-Adresse für CloseFlow bestätigen", en: "Confirm your new CloseFlow email address" },
};

const languageSwitch = (de: string, en: string): string =>
    `{{ if eq .Data.language "de" }}${de}{{ else }}${en}{{ end }}`;

export const authEmailKinds = Object.keys(authContent) as AuthTemplateKind[];

export const buildSupabaseAuthTemplate = (kind: AuthTemplateKind): { subject: string; html: string } => {
    const entry = authContent[kind];
    const render = (language: EmailLanguage) => {
        const content = entry[language];
        return renderEmailHtml(language, {
            ...content,
            cta: content.cta ? { ...content.cta, url: entry.url } : undefined,
            footer: footers[language],
        });
    };
    return {
        subject: languageSwitch(subjects[kind].de, subjects[kind].en),
        html: languageSwitch(render("de"), render("en")),
    };
};
