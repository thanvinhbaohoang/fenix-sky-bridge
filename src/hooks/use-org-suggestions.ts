import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { listOrgProfiles } from "@/lib/org-profiles.functions";

const CONSUMER_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "proton.me",
  "pm.me",
  "protonmail.com",
  "aol.com",
]);

/**
 * Suggestions for coworkers in the signed-in user's email domain. Empty when
 * signed out or when the user's email is on a consumer domain (gmail, etc.).
 */
export function useOrgSuggestions() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const domain = email?.split("@")[1]?.toLowerCase() ?? null;
  const isOrg = !!domain && !CONSUMER_DOMAINS.has(domain);

  const query = useQuery({
    queryKey: ["org-profiles", domain ?? "none"],
    enabled: isOrg,
    staleTime: 10 * 60 * 1000,
    queryFn: () => listOrgProfiles(),
  });

  return {
    profiles: query.data ?? [],
    domain,
    isOrg,
  };
}