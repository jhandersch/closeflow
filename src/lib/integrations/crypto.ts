import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const getKey = (secret = process.env.INTEGRATIONS_ENCRYPTION_KEY) => {
  const key = secret ? Buffer.from(secret, "base64") : null;
  if (!key || key.length !== 32) {
    throw new Error("INTEGRATIONS_ENCRYPTION_KEY must be a base64-encoded 32 byte key.");
  }
  return key;
};

export const isEncryptionConfigured = () => {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
};

export function encryptJson(value: unknown, secret?: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64")).join(".");
}

export function decryptJson<T>(payload: string, secret?: string): T {
  const [iv, tag, data] = payload.split(".").map((part) => Buffer.from(part, "base64"));
  if (!iv || !tag || !data) throw new Error("Invalid encrypted payload.");
  const decipher = createDecipheriv("aes-256-gcm", getKey(secret), iv);
  decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8")) as T;
}

const STATE_TTL_MS = 10 * 60 * 1000;

export function signOAuthState(userId: string, secret = process.env.INTEGRATIONS_ENCRYPTION_KEY, now = Date.now()) {
  const payload = `${userId}.${now}.${randomBytes(8).toString("hex")}`;
  const signature = createHmac("sha256", getKey(secret)).update(payload).digest("hex");
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

export function verifyOAuthState(
  state: string,
  userId: string,
  secret = process.env.INTEGRATIONS_ENCRYPTION_KEY,
  now = Date.now(),
) {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const lastDot = decoded.lastIndexOf(".");
    const payload = decoded.slice(0, lastDot);
    const signature = Buffer.from(decoded.slice(lastDot + 1), "hex");
    const expected = createHmac("sha256", getKey(secret)).update(payload).digest();
    if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) return false;
    const [stateUser, issuedAt] = payload.split(".");
    return stateUser === userId && now - Number(issuedAt) >= 0 && now - Number(issuedAt) <= STATE_TTL_MS;
  } catch {
    return false;
  }
}
