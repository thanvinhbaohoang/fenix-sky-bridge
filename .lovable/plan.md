## Goal
Let users sign in with Google, then use their Google Contacts as autocomplete suggestions when assigning a task.

## Scope

### 1. Google sign-in (Lovable Cloud auth)
- Enable Google as an auth provider on the backend.
- Request extra OAuth scope: `https://www.googleapis.com/auth/contacts.readonly`.
- Add a lightweight auth surface:
  - `/auth` route with "Continue with Google" button.
  - Header slot in `Workspace` showing signed-in user + Sign out, or a Sign in button.
- Store the Google `provider_token` (returned by Supabase after OAuth) in memory/session so we can call Google APIs on behalf of the user.

### 2. Pull Google Contacts
- New server function `fetchGoogleContacts` (protected via `requireSupabaseAuth`) that:
  - Accepts the Google access token from the client.
  - Calls `https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses&pageSize=1000`.
  - Returns a normalized list: `{ name, email }[]` (deduped, only entries with an email).
- Client caches the result with TanStack Query (`['google-contacts']`, staleTime 10 min).
- Graceful fallback if the token is missing/expired: prompt user to re-sign-in with Google.

### 3. Assignee suggestions in Workspace
- In the "Add task" and "Reassign" flows in `src/components/demo/Workspace.tsx`:
  - Replace/augment the email input with a combobox (shadcn `Command` + `Popover`) showing contact suggestions filtered by typed text (matches name or email).
  - Selecting a suggestion fills both email and name fields.
  - Free-typed emails still work (no forced selection); `guessNameFromEmail` remains the fallback when a contact isn't matched.

### 4. Existing Resend notification
- Unchanged. It will now more often have a real name because contacts provide it.

## Technical notes
- Auth: `supabase.auth.signInWithOAuth({ provider: 'google', options: { scopes: 'openid email profile https://www.googleapis.com/auth/contacts.readonly', redirectTo: `${window.location.origin}/auth/callback` } })`. Callback route hydrates session then navigates back to app.
- `provider_token` is only present immediately after OAuth; persist it in `sessionStorage` keyed to the user id so page reloads keep contacts working until token expiry (~1h). On 401 from People API, clear it and show a "Reconnect Google" button.
- People API is called server-side via `createServerFn` to keep the token off third-party origins and to allow future caching.
- No new tables needed; contacts are fetched on demand.
- Files:
  - new `src/routes/auth.tsx`, `src/routes/auth.callback.tsx`
  - new `src/lib/google-contacts.functions.ts`
  - new `src/hooks/use-google-contacts.ts`
  - new `src/components/AssigneeCombobox.tsx`
  - edit `src/components/demo/Workspace.tsx` to use the combobox and show auth state

## Out of scope
- Writing back to Google Contacts.
- Long-lived refresh tokens / offline access (requires storing refresh tokens server-side; can add later if you want persistent contact sync).
