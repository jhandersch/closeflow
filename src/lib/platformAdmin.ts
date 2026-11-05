import type { User } from "@supabase/supabase-js";

// Platform admins are matched by email, so the email must be confirmed.
// Otherwise someone could register an allowlisted address they do not own.
export const isPlatformAdminUser = (user: Pick<User, "email" | "email_confirmed_at"> | null | undefined) => {
  if (!user?.email || !user.email_confirmed_at) return false;

  const admins = (process.env.CLOSEFLOW_ADMIN_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return admins.includes(user.email.toLowerCase());
};
