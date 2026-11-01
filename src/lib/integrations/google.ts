export const GOOGLE_SCOPES = {
  gmail: "https://www.googleapis.com/auth/gmail.send",
  calendar: "https://www.googleapis.com/auth/calendar.events",
} as const;

export type GoogleCredentials = {
  refreshToken: string;
  accessToken?: string;
  expiresAt?: number;
  scopes: string[];
  email: string | null;
};

export const getGoogleConfig = () => {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL;
  if (!clientId || !clientSecret || !baseUrl) return null;
  return {
    clientId,
    clientSecret,
    redirectUri: `${baseUrl.replace(/\/$/, "")}/api/integrations/google/callback`,
  };
};

type GoogleConfig = NonNullable<ReturnType<typeof getGoogleConfig>>;

export function buildGoogleAuthUrl(config: GoogleConfig, state: string) {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: ["openid", "email", GOOGLE_SCOPES.gmail, GOOGLE_SCOPES.calendar].join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  id_token?: string;
};

async function requestToken(body: Record<string, string>, fetchImpl: typeof fetch): Promise<TokenResponse> {
  const response = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Google token request failed (${response.status}).`);
  return (await response.json()) as TokenResponse;
}

const emailFromIdToken = (idToken?: string) => {
  try {
    const payload = JSON.parse(Buffer.from(idToken?.split(".")[1] ?? "", "base64url").toString("utf8"));
    return typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
};

export async function exchangeGoogleCode(
  config: GoogleConfig,
  code: string,
  fetchImpl: typeof fetch = fetch,
): Promise<GoogleCredentials> {
  const token = await requestToken(
    {
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    },
    fetchImpl,
  );
  if (!token.refresh_token) throw new Error("Google did not return a refresh token.");
  return {
    refreshToken: token.refresh_token,
    accessToken: token.access_token,
    expiresAt: Date.now() + (token.expires_in ?? 3600) * 1000,
    scopes: (token.scope ?? "").split(" ").filter(Boolean),
    email: emailFromIdToken(token.id_token),
  };
}

export async function getGoogleAccessToken(
  credentials: GoogleCredentials,
  config: GoogleConfig,
  fetchImpl: typeof fetch = fetch,
) {
  if (credentials.accessToken && credentials.expiresAt && credentials.expiresAt - 60_000 > Date.now()) {
    return credentials.accessToken;
  }
  const token = await requestToken(
    {
      refresh_token: credentials.refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
    },
    fetchImpl,
  );
  if (!token.access_token) throw new Error("Google did not return an access token.");
  return token.access_token;
}

export async function revokeGoogleToken(refreshToken: string, fetchImpl: typeof fetch = fetch) {
  await fetchImpl("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token: refreshToken }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => undefined);
}

const stripHeaderBreaks = (value: string) => value.replace(/[\r\n]+/g, " ").trim();

export function buildRawEmail(input: { to: string; subject: string; body: string }) {
  const subject = `=?UTF-8?B?${Buffer.from(stripHeaderBreaks(input.subject)).toString("base64")}?=`;
  const lines = [
    `To: ${stripHeaderBreaks(input.to)}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(input.body).toString("base64"),
  ];
  return Buffer.from(lines.join("\r\n")).toString("base64url");
}

export async function sendGmail(
  accessToken: string,
  input: { to: string; subject: string; body: string },
  fetchImpl: typeof fetch = fetch,
) {
  const response = await fetchImpl("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: buildRawEmail(input) }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Gmail send failed (${response.status}).`);
}

export async function createGoogleCalendarEvent(
  accessToken: string,
  input: { title: string; description?: string | null; startsAt: string; durationMinutes?: number },
  fetchImpl: typeof fetch = fetch,
) {
  const start = new Date(input.startsAt);
  const end = new Date(start.getTime() + (input.durationMinutes ?? 30) * 60_000);
  const response = await fetchImpl("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: input.title,
      description: input.description ?? undefined,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Google Calendar request failed (${response.status}).`);
  const created = (await response.json()) as { id?: string };
  return created.id ?? null;
}
