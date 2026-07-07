import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  clearGoogleToken,
  getGoogleToken,
  setGoogleToken,
} from "@/lib/google-token";
import type { Contact } from "@/components/demo/Workspace";

type Person = {
  names?: { displayName?: string; givenName?: string; familyName?: string }[];
  emailAddresses?: { value?: string }[];
};

async function fetchPeople(token: string): Promise<Contact[]> {
  const url =
    "https://people.googleapis.com/v1/people/me/connections" +
    "?personFields=names,emailAddresses&pageSize=1000&sortOrder=FIRST_NAME_ASCENDING";
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401 || res.status === 403) {
    clearGoogleToken();
    throw new Error("google-auth-required");
  }
  if (!res.ok) throw new Error(`People API ${res.status}`);
  const data = (await res.json()) as { connections?: Person[] };
  const out: Contact[] = [];
  const seen = new Set<string>();
  for (const p of data.connections ?? []) {
    const email = p.emailAddresses?.[0]?.value?.trim();
    if (!email) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const name = p.names?.[0]?.displayName?.trim() || email.split("@")[0];
    out.push({ name, email });
  }
  return out;
}

/**
 * Returns Google contacts for the signed-in user. Requires the user to have
 * signed in with Google and granted the contacts.readonly scope. If no token
 * is available, returns an empty list (no error).
 */
export function useGoogleContacts() {
  const [token, setToken] = useState<string | null>(() => getGoogleToken());

  useEffect(() => {
    // Capture provider_token from the current session if we don't have it.
    if (!token) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        const t = (session as any)?.provider_token as string | undefined;
        if (t) {
          setGoogleToken(t);
          setToken(t);
        }
      });
    }
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const t = (session as any)?.provider_token as string | undefined;
      if (t) {
        setGoogleToken(t);
        setToken(t);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [token]);

  const query = useQuery({
    queryKey: ["google-contacts", token ? token.slice(0, 8) : "none"],
    enabled: !!token,
    staleTime: 10 * 60 * 1000,
    queryFn: () => fetchPeople(token!),
  });

  return {
    contacts: query.data ?? [],
    isLoading: !!token && query.isLoading,
    error: query.error as Error | null,
    hasToken: !!token,
  };
}