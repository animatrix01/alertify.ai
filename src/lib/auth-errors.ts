/**
 * Supabase Auth sometimes returns JSON in `error.message` (e.g. validation_failed).
 */
export function formatAuthError(err: unknown): string {
  if (!err || typeof err !== "object" || !("message" in err)) {
    return "Authentication failed";
  }
  const raw = String((err as { message: string }).message);

  if (
    raw.includes("OAuth secret") ||
    raw.includes("Unsupported provider") ||
    raw.includes("validation_failed")
  ) {
    return "Google sign-in is not configured: add the Google Client ID and Client Secret in the Supabase Dashboard under Authentication → Providers → Google. Until then, use email and password below.";
  }

  try {
    const parsed = JSON.parse(raw) as { msg?: string; error_description?: string };
    if (typeof parsed.msg === "string") {
      if (parsed.msg.includes("OAuth secret") || parsed.msg.includes("Unsupported provider")) {
        return "Google sign-in is not configured in Supabase (missing OAuth Client Secret). Use email and password, or complete the Google provider setup.";
      }
      return parsed.msg;
    }
    if (typeof parsed.error_description === "string") {
      return parsed.error_description;
    }
  } catch {
    /* message was not JSON */
  }

  return raw || "Authentication failed";
}
