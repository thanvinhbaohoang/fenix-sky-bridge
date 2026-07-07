## Goal
When the signed-in user has an organization email (e.g. `harold@fenix.ai`), suggest coworkers from that same domain in the assignee picker. Combine two sources so it works day one and gets better over time.

## Source A — Google Workspace directory
- Extend the Google OAuth scope with `https://www.googleapis.com/auth/directory.readonly`.
- New client fetch inside `useGoogleContacts` (or a new `useGoogleDirectory` hook) that calls
  `GET https://people.googleapis.com/v1/people:listDirectoryPeople?readMask=names,emailAddresses&sources=DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE&pageSize=1000`
  and paginates via `nextPageToken`.
- Silently no-op on `403 / 400` (personal Gmail accounts have no directory) so nothing breaks for non-Workspace users.

## Source B — App-internal org profiles (works for any provider)
- New table `public.profiles`:
  - `id uuid pk` (matches `auth.users.id`)
  - `email text not null unique`
  - `full_name text`
  - `avatar_url text`
  - `email_domain text generated always as (lower(split_part(email,'@',2))) stored`
  - `updated_at timestamptz`
  - RLS: `SELECT` policy allows any authenticated user to read rows where `email_domain = (select lower(split_part(u.email,'@',2)) from auth.users u where u.id = auth.uid())` — i.e. only see people in your own domain.
  - `UPDATE / INSERT` allowed only for `auth.uid() = id`.
  - `service_role` full access.
  - GRANTs to `authenticated` and `service_role` per platform rules.
- Trigger `handle_new_user` on `auth.users` insert → upsert `profiles` row from `raw_user_meta_data` (`full_name`, `avatar_url`) + `email`.
- Trigger on `auth.users` update to keep `email` / metadata in sync.
- New server function `listOrgProfiles` (protected via `requireSupabaseAuth`) that returns `{ name, email }[]` for the caller's domain — relies on the RLS policy above.

## Wiring into the UI
- New hook `useOrgSuggestions()` that runs `listOrgProfiles` via TanStack Query (staleTime 10 min, only when signed in).
- Extend `useGoogleContacts` to also return `directory` contacts (or add `useGoogleDirectory`).
- In `Workspace.tsx`, `mergedContacts` becomes the union of:
  1. local/default contacts,
  2. personal Google contacts (existing),
  3. Google Workspace directory,
  4. app profiles for the same domain.
  Dedupe by lowercased email; prefer entries with a real display name.
- In the `ReassignPicker` search results, group into two sections when both exist:
  - "From your organization" (sources 3+4)
  - "Contacts" (sources 1+2)
  Keep the free-text add-contact flow unchanged.

## Skipping personal-email noise
- Detect free/consumer domains (`gmail.com`, `outlook.com`, `yahoo.com`, `hotmail.com`, `icloud.com`, `proton.me`, `pm.me`) and hide the "organization" section for those users; still show personal contacts.

## Files
- Migration: create `profiles`, RLS, GRANTs, trigger.
- `src/lib/org-profiles.functions.ts` — `listOrgProfiles` server fn.
- `src/hooks/use-org-suggestions.ts` — TanStack Query wrapper.
- `src/hooks/use-google-contacts.ts` — add directory fetch + return typed sources.
- `src/routes/auth.tsx` — add `directory.readonly` to requested `scope`.
- `src/components/demo/Workspace.tsx` — merge sources, tag origin, show grouped picker.

## Out of scope
- Admin/invite flows, org "spaces", cross-domain sharing.
- Writing to Google Workspace directory.
- Long-lived Google refresh tokens.

## Notes for you
- Google Workspace admins may need to allow the `directory.readonly` scope for third-party apps; if they don't, source A silently returns nothing and source B still works.
- Source B only shows coworkers who have already signed into this app at least once.
