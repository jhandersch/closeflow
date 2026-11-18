export const PROFILE_AVATAR_DISABLED_ERROR =
  "Profile image URLs are disabled for privacy.";

export function hasUnsupportedProfileAvatarUrl(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
