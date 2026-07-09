import { createServerClient } from "@supabase/ssr";

/**
 * Service-role client for trusted server-side writes (lead intake).
 * No auth/cookies in v1 — this site has no logged-in users.
 */
export function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
    },
  );
}
