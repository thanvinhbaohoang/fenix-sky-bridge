import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type OrgProfile = { name: string; email: string };

/**
 * Returns profiles in the caller's email domain. RLS restricts the query to
 * profiles whose email_domain matches the caller's JWT email domain, so this
 * server function does not need to filter by domain itself.
 */
export const listOrgProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OrgProfile[]> => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("email, full_name")
      .order("full_name", { ascending: true, nullsFirst: false });
    if (error) throw error;
    return (data ?? [])
      .filter((r) => !!r.email)
      .map((r) => ({
        email: r.email as string,
        name: (r.full_name as string | null) || (r.email as string).split("@")[0],
      }));
  });