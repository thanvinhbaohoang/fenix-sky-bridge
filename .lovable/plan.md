## Goal

When reassigning a task on `/project`, resolve a real name from the email alone and send a full task-brief email to that person via Resend.

## Behavior

**Contact picker (Add contact form)**
- User only types an email address; the Name field disappears.
- On blur/submit, guess a display name from the local-part:
  - `sarah.reyes@fenixai.law` → "Sarah Reyes"
  - `s.reyes@fenixai.law` → "S. Reyes"
  - `sreyes@…` → "Sreyes"
  - Aliases (`info`, `ip`, `no-reply`, `admin`, `contact`, `hello`, `team`, `support`) → use domain: "Client (client.com)"
- User can still edit the guessed name before confirming.

**Assignment triggers an email**
- Every time `reassign(taskId, name)` succeeds with a non-null name, send a "Full task brief" email to that contact's address.
- Toast confirms send success/failure.
- Unassign (name = null) sends nothing.

**Email content (Full task brief)**
- Subject: `[{APP_NUMBER}] {TASK_TITLE} — assigned to you`
- Body (HTML + plain text):
  - Header: "You've been assigned a task on {app.title} ({app.appNumber})"
  - Event context: code badge (e.g. CTNF — Non-Final Rejection) and detected date
  - Task title, description, tag (urgent/action/optional)
  - Suggested tools (bulleted)
  - "Open in FenixAI" link → `{origin}/project?app={encoded appNumber}`
  - Footer: "Sent by FenixAI on behalf of {app.assignee}"

## Files

**New**
- `src/lib/name-from-email.ts` — pure `guessNameFromEmail(email: string): string` with the alias list and dot/underscore/dash splitting rules.
- `src/lib/notify-assignment.functions.ts` — TanStack `createServerFn({ method: "POST" })`:
  - `inputValidator` (zod): `{ to: string; toName: string; task: { title, description, tag, tools }, app: { appNumber, title, assignee }, event: { code, label, date } | null, origin: string }`
  - `.handler`: reads `process.env.RESEND_API_KEY` and `process.env.RESEND_FROM` (fallback `onboarding@resend.dev`), POSTs to `https://api.resend.com/emails` with the rendered HTML+text. Returns `{ id }` on success or throws.
  - No SDK; plain `fetch` to keep the Worker bundle small.

**Edited**
- `src/components/demo/Workspace.tsx`
  - `ReassignPicker` add-contact form: drop Name field; keep Email; call `guessNameFromEmail`, show editable "Suggested name" field pre-filled.
  - `reassign()` in `Workspace`: on non-null pick, look up the contact's email, call the server fn, show success/failure toast via existing `useToast`.
- Nothing to change in `/template`.

**Secret**
- Request `RESEND_API_KEY` via `add_secret` (user pastes it). Also optional `RESEND_FROM` for a verified sender; if absent we send from `onboarding@resend.dev` (deliverable to the Resend account owner only until a domain is verified).

## Technical notes

- `origin` is captured client-side (`window.location.origin`) and passed to the server fn so the "Open in FenixAI" link matches the current environment.
- Server fn is unauthenticated (public demo). To avoid it being an open relay, the handler only accepts recipients from a small allow-shape: any email, but the body always mentions the FenixAI product context and never forwards arbitrary HTML — content is built server-side from the validated task fields. Rate limit is intentionally out of scope for the demo.
- Guess rules (from `name-from-email.ts`):
  - Lowercase local-part, strip `+tag` suffix.
  - If local-part in alias set → return `"{Capitalized domain root}" ` (e.g. `client.com` → "Client").
  - Split on `.`, `_`, `-`. Capitalize each token; single-letter tokens keep a trailing period ("s" → "S.").
  - If only one token, capitalize it.

## Out of scope
- OAuth into the user's Gmail/Outlook to read their address book.
- Persisting assignment history to the DB.
- Verifying a Resend sending domain (user does that in Resend dashboard).
