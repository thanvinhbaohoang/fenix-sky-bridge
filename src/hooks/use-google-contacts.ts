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

function personToContact(p: Person): Contact | null {
  const email = p.emailAddresses?.[0]?.value?.trim();
  if (!email) return null;
  const name = p.names?.[0]?.displayName?.trim() || email.split("@")[0];
  return { name, email };
}

async function fetchConnections(token: string): Promise<Contact[]> {
  const url =
    "https://people.googleapis.com/v1/people/me/connections" +
    "?personFields=names,emailAddresses&pageSize=1000&sortOrder=FIRST_NAME_ASCENDING";
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) {
    clearGoogleToken();
    throw new Error("google-auth-required");
  }
  if (!res.ok) return [];
  const data = (await res.json()) as { connections?: Person[] };
  return dedupe((data.connections ?? []).map(personToContact));
}

// Lists people in the signed-in user's Google Workspace directory.
// Returns [] silently for personal Gmail (no directory) or missing scope.
async function fetchDirectory(token: string): Promise<Contact[]> {
  const out: Contact[] = [];
  let pageToken: string | undefined;
  for (let i = 0; i < 10; i++) {
    const params = new URLSearchParams({
      readMask: "names,emailAddresses",
      "sources": "DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE",
      pageSize: "1000",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await fetch(
      `https://people.googleapis.com/v1/people:listDirectoryPeople?${params}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) break; // 400/403 for non-Workspace accounts — silent no-op.
    const data = (await res.json()) as {
      people?: Person[];
      nextPageToken?: string;
    };
    for (const p of data.people ?? []) {
      const c = personToContact(p);
      if (c) out.push(c);
    }
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return dedupe(out);
}

function dedupe(list: (Contact | null)[]): Contact[] {
  const map = new Map<string, Contact>();
  for (const c of list) {
    if (!c) continue;
    const key = c.email.toLowerCase();
    if (!map.has(key)) map.set(key, c);
  }
  return Array.from(map.values());
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
    queryFn: async () => {
      const [connections, directory] = await Promise.all([
        fetchConnections(token!),
        fetchDirectory(token!),
      ]);
      return { connections, directory };
    },
  });

  return {
    contacts: query.data?.connections ?? [],
    directory: query.data?.directory ?? [],
    isLoading: !!token && query.isLoading,
    error: query.error as Error | null,
    hasToken: !!token,
  };
}