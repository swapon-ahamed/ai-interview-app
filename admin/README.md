---
noteId: "99e6b25089cd11f186e397bbc81dc726"
tags: []

---

# AI Interview — Admin

Next.js app for admin authentication (signup/signin) and the admin dashboard. Runs
independently from `web/` (candidate-facing app) and `agent/` (the AI interviewer),
on its own port so all three can run side by side locally.

## Configuration

### Environment variables

Copy the example file and fill in real values:

```bash
cd admin
cp .env.example .env.local
```

| Variable | Where to find it | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Settings → API → Project URL | Same Supabase project used by `web/`. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard → Settings → API → `anon` / publishable key | Use the **anon** key here, not the `service_role` key — this key runs in the browser. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Settings → API → `service_role` secret key | Server-only (no `NEXT_PUBLIC_` prefix). Used by `/api/register-company` (writes the `companies` table) and `/api/companies` (lists all companies for the dashboard grid). Never expose this to the browser. |

The two `NEXT_PUBLIC_` vars need that prefix (unlike `web/`, which only calls
Supabase from server-side API routes) because this app talks to Supabase Auth
directly from client components. `SUPABASE_SERVICE_ROLE_KEY` must **not** have
that prefix — it's only read in server-side route handlers.

`.env.local` is gitignored — never commit real keys.

### Database — run the schema once

Company registration needs the `companies` table. In the Supabase dashboard →
SQL Editor, run `supabase/schema.sql` (repo root) — it's idempotent
(`create table if not exists`), so re-running it after pulling future changes
is safe.

### Supabase Auth settings

Auth is handled entirely by Supabase Auth — no custom `admins` table or
password handling in this repo. Note the two account types go through
different paths (see "Two kinds of accounts" below):

- **Admin accounts** (`/signup`) use client-side `supabase.auth.signUp()`.
  **Settings → Authentication → Providers → Email** must be enabled for this.
  If **"Confirm email"** is on (Supabase's default), a new admin signup
  doesn't return a session until they click the link in the confirmation
  email. Disable that setting if you'd rather new admins land straight in
  the dashboard after signup.
- **Company accounts** (`/dashboard/register`) are created server-side via
  `auth.admin.createUser({ ..., email_confirm: true })`, which bypasses
  "Confirm email" entirely — no email is sent, confirmed or not.
- Any user created here (via this app, the Supabase dashboard, or another app using
  the same project) can sign in — there is currently no role/permission distinction
  between "admin" and any other Supabase Auth user in this project.

## Two kinds of accounts

- **Admin accounts** (`/signup`, `/signin`) — email + password only. Anyone who
  can sign in here is treated as an admin with full access to the company
  directory. There's no separate `admins` table or role flag — it's whoever has
  a Supabase Auth account in this project. The very first admin account has to
  be created via `/signup` (or directly in the Supabase dashboard) before
  anyone can log in and register companies.
- **Company accounts** — created *by* a logged-in admin, from
  `/dashboard/register` (not public). Each one is also a full Supabase Auth
  account (so the company can eventually sign in too), plus a row in the
  `companies` table.

## Company registration (`/dashboard/register`)

Protected — redirects to `/signin` if there's no session. Collects:

| Field | Required |
|---|---|
| Company name | Yes |
| Mobile number | Yes |
| Contact address | No |
| Email | Yes (also doubles as that company's sign-in username) |
| Password | Yes |

Flow:
1. The form submits directly to `POST /api/register-company` (service-role
   key, requires the caller to be a signed-in admin) with the email,
   password, and company fields in the request body.
2. That route creates the Supabase Auth account server-side via
   `supabaseAdmin.auth.admin.createUser({ ..., email_confirm: true })` — this
   both creates and immediately confirms the account, so **no verification
   email is ever sent**. The company can sign in with the password the admin
   set as soon as they're activated (see "Moderation" below); there's no
   email step in between. It then inserts the `companies` row with
   `status: 'pending'`. If that insert fails, the just-created auth user is
   deleted so a retry with the same email doesn't hit "already registered".
3. Trusting the request body here (unlike the old flow) is safe because this
   endpoint creates a *brand-new* account chosen by an authenticated admin —
   there's no pre-existing account being impersonated.

**Where the password lives:** only in Supabase Auth's own encrypted `auth.users`
table — it is intentionally **not** duplicated into `companies` or anywhere else
in this codebase. Storing a second copy (hashed or not) would just be another
place it could leak for no benefit, since Supabase Auth already owns
authentication end to end.

**Known limitation:** every Supabase Auth user in this project — admin or
company — currently has identical access if they sign into `/dashboard` (see
"Two kinds of accounts" above). There's no role check preventing a company
account from also registering more companies. Fine for the current
single-tenant internal-tool scope; would need a real `role` column (or a
Supabase custom claim) before opening this up further.

## Companies grid (`/dashboard`)

`GET /api/companies` (service-role key) returns every row in `companies`,
gated only on the caller presenting a valid Supabase session access token
(`Authorization: Bearer <token>`) — not on any per-row ownership check. This
is a deliberate departure from the `companies_select_own` RLS policy in
`supabase/schema.sql`, which still restricts *direct* client reads to a
user's own row; the API route intentionally bypasses that so any signed-in
admin sees the full shared directory.

Each card links to `/dashboard/companies/[id]` to edit that company.

## Editing a company (`/dashboard/companies/[id]`)

Protected, same as `/dashboard/register`. Backed by
`app/api/companies/[id]/route.ts`:

- `GET` — fetches one company row (401 if the caller has no valid session,
  404 if the id doesn't exist).
- `PATCH` — updates `company_name`, `mobile_number`, `contact_address`
  (`company_name`/`mobile_number` still required, same validation as
  registration).

`email` is shown but disabled — it's the company's Supabase Auth sign-in
identifier, and changing it here would desync the `companies` row from
`auth.users` (would need `supabaseAdmin.auth.admin.updateUserById`, plus
Supabase's own re-confirmation flow, to do safely). Out of scope for now.

## Moderation (`companies.status`)

Every company row has a `status`: `'pending'` (the default on registration) or
`'active'`. This is the *only* gate a new company has to clear — since
registration skips email confirmation entirely (see above), a company can't
sign in at all until an admin flips them to active.

- The `/dashboard` grid shows a Pending/Active badge on every card, surfaces
  pending companies first, shows a "(N pending approval)" count next to the
  "Companies" heading, and has an inline **Activate** button directly on each
  pending card (no need to open the company first).
- The company edit page (`/dashboard/companies/[id]`) has the same
  "Activate Company" / "Revert to Pending" button, for when you're already
  there editing a company's details.
- Both call `POST /api/companies/[id]/status` (service-role key, any
  signed-in admin, body `{ status: "pending" | "active" }`) — kept as its own
  endpoint rather than folded into the general edit `PATCH`, so moderation is
  a distinct, auditable action from editing profile fields.
- **Enforcement lives in `web/`, not here**: `web/app/signin` looks up the
  signed-in user's `companies.status` right after a successful password
  check and immediately signs them back out if it isn't `'active'`.
  `web/app/dashboard` re-checks on every load too, so an admin reverting an
  already-signed-in company back to `'pending'` takes effect on their next
  page load, not just their next login. Without that `web/`-side check, this
  status field would just be a label with no actual effect. See the root
  `README.md`'s "How an interview works" section for the end-to-end flow.

### Port

Runs on **3001** (`web/` uses 3000) so both can run at the same time locally:

```json
"dev": "next dev -p 3001",
"start": "next start -p 3001"
```

## Running locally

```bash
cd admin
npm install
npm run dev
```

Visit `http://localhost:3001`:
- No session → redirected to `/signin`
- Valid session → redirected to `/dashboard`

## Structure

```
admin/
  app/
    layout.tsx                      # renders <NavBar /> above every page
    page.tsx                        # redirects to /signin or /dashboard based on session
    signin/page.tsx                 # email/password sign in (admin accounts)
    signup/page.tsx                 # email/password sign up (admin accounts — no company fields)
    dashboard/page.tsx              # protected: companies grid, inline Activate buttons, "Register Company" button
    dashboard/register/page.tsx     # protected: register-a-company form
    dashboard/companies/[id]/page.tsx # protected: edit-a-company form + moderation
    api/register-company/route.ts   # server-side: writes the companies table (service role)
    api/companies/route.ts          # server-side: lists all companies (service role)
    api/companies/[id]/route.ts     # server-side: get/update one company (service role)
    api/companies/[id]/status/route.ts # server-side: moderation — set pending/active (service role)
  components/NavBar.tsx             # top nav — Sign In/Sign Up when logged out, Dashboard/Sign Out when logged in
  lib/supabase.ts                   # browser client, getSupabaseAdmin() (service role, server-only), getAuthenticatedUser()
```

## Status

Admin auth (signup/signin), admin-gated company registration, a dashboard with
a companies grid, per-company editing, and pending/active moderation are
implemented. Interview management (create/list/report) still lives in `web/`.
