---
noteId: "99e6b25089cd11f186e397bbc81dc726"
tags: []

---

# AI Interview — Admin

Next.js app for admin authentication (invite-only sign in) and the admin dashboard. Runs
independently from `web/` (candidate-facing app) and `agent/` (the AI interviewer),
on its own port so all three can run side by side locally.

## Configuration

### Environment variables

Secrets go in a per-environment, gitignored file (see `ENVIRONMENTS.md` at the
repo root for the dev/prod setup):

```bash
cd admin
cp .env.example .env.development.local   # values from the DEV Supabase project
```

Non-secret settings (`NEXT_PUBLIC_ADMIN_URL`, `NEXT_PUBLIC_WEB_URL`,
`NEXT_PUBLIC_APP_ENV`) are committed in `.env.development` / `.env.production`.
In production (Vercel) the secrets are Vercel environment variables.

| Variable | Where to find it | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Settings → API → Project URL | Same Supabase project as `web/` *in the same environment* (dev project for dev, prod project for prod). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard → Settings → API → `anon` / publishable key | Use the **anon** key here, not the `service_role` key — this key runs in the browser. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Settings → API → `service_role` secret key | Server-only (no `NEXT_PUBLIC_` prefix). Used by `/api/register-company` (writes the `companies` table) and `/api/companies` (lists all companies for the dashboard grid). Never expose this to the browser. |

The two `NEXT_PUBLIC_` vars need that prefix (unlike `web/`, which only calls
Supabase from server-side API routes) because this app talks to Supabase Auth
directly from client components. `SUPABASE_SERVICE_ROLE_KEY` must **not** have
that prefix — it's only read in server-side route handlers.

`*.local` env files are gitignored — never commit real keys.

### Database — run the schema once

Company registration needs the `companies` table. In the Supabase dashboard →
SQL Editor, run `supabase/schema.sql` (repo root) — it's idempotent
(`create table if not exists`), so re-running it after pulling future changes
is safe.

### Supabase Auth settings

Passwords and sessions are handled entirely by Supabase Auth. *Who* is an
admin vs a company is decided by this repo's own tables (`admins`,
`companies`), checked server-side on every API call — see "Account types".

Required project settings (Supabase Dashboard → Authentication):

- **Sign In / Providers → Email**: enabled, with **Confirm email ON** — company
  self sign-up relies on it to send the verification link and to block
  sign-in until the link is clicked. Set the minimum password length to 8+
  to match the apps' own check (`lib/password.ts`).
- **URL Configuration → Redirect URLs**: must include both apps, or emailed
  links fall back to the Site URL and land on the wrong page. Locally:
  `http://localhost:3000/**` and `http://localhost:3001/**`; in production add
  your real web and admin domains (e.g. `https://app.example.com/**`).
- **Emails → SMTP Settings**: configure a custom SMTP provider (Resend,
  SendGrid, Postmark, Amazon SES, Brevo, …) before going live. Supabase's
  built-in mailer only delivers to members of your Supabase team and only a
  few emails per hour, so real companies would never receive verification,
  invite or password-reset emails without it.
- Optionally **Attack Protection → leaked password protection** (rejects
  passwords found in known breaches).

## Account types

Both live in the same Supabase project; neither "being signed in" alone grants
anything.

- **Admins** — a Supabase Auth user **with a row in `admins`**. Every API route
  in this app calls `requireAdmin()` (`lib/auth.ts`), which returns 403 for
  anyone else (companies included). `components/NavBar.tsx` also asks
  `/api/me` on every page and signs non-admins out, so they never see a broken
  dashboard. Admins are **invite-only**: an existing admin invites by email
  from `/dashboard/admins` (`POST /api/admins` → `inviteUserByEmail`); the
  invite link verifies the address and lands on `/auth/set-password`, where the
  new admin chooses their own password. `/signup` only explains this. Admins
  can remove other admins (not themselves) — that deletes the account.
- **Companies** — a Supabase Auth user with a row in `companies`. They use the
  `web/` app, never this one.

**Bootstrapping the first admin** (fresh project, or the `admins` table is
empty): create the user in Supabase Dashboard → Authentication → Users → *Add
user* (or *Invite user*), then in the SQL Editor:

```sql
insert into admins (user_id, email)
select id, email from auth.users where email = 'you@example.com';
```

Forgot-password works for admins at `/forgot-password` (link → `/auth/set-password`).

## Company accounts

Two ways in, both ending as `companies.status = 'pending'`:

1. **Self sign-up** on the web app (`web/signup` → `web/api/company-signup`):
   the company enters its details and password; Supabase emails a
   verification link (→ `web/auth/confirmed`). Marked "Self sign-up" on the
   dashboard. The endpoint is rate-limited per IP and globally and has a bot
   honeypot.
2. **Admin invite** from `/dashboard/register` (`POST /api/register-company`):
   collects company name, mobile number, optional address and email — **no
   password**. Supabase emails an invite; the link verifies the email and
   lands on `web/auth/set-password`, where the company chooses its own
   password. If the `companies` insert fails, the just-created auth user is
   deleted so a retry with the same email works.

**Where the password lives:** only in Supabase Auth's own `auth.users` table —
never in `companies` or anywhere else in this codebase, and admins never see or
choose a company's password.

## Companies grid (`/dashboard`)

`GET /api/companies` (service-role key) returns every row in `companies`
(plus each one's `email_verified` flag from Supabase Auth), gated on the caller
being an admin (`requireAdmin()`) — not on any per-row ownership check. This
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

Every company row has a `status`: `'pending'` (the default) or `'active'`. A
company can use the web dashboard only when **both** its email is verified
and an admin has set it `'active'`.

- The `/dashboard` grid shows Pending/Active, "Email not verified" and "Self
  sign-up" badges, surfaces pending companies first, and has an inline
  **Activate** button on each pending card. The button is disabled until the
  company has verified its email.
- The company edit page (`/dashboard/companies/[id]`) shows the same status
  and verification state, with "Activate Company" / "Revert to Pending".
- Both call `POST /api/companies/[id]/status` (admin-only, body
  `{ status: "pending" | "active" }`). Activating an unverified company
  returns **409** — verification is enforced server-side, not just by the
  disabled button.
- **Enforcement in `web/`** is server-side: every company API route calls
  `requireActiveCompany()` (`web/lib/companyAuth.ts`), which requires a
  verified email, a `companies` row, and status `'active'`. `web/app/signin`
  and `web/app/dashboard` repeat the check client-side only to show a clear
  message and sign the user out; reverting a company to `'pending'` cuts off
  its API access immediately.

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
    signin/page.tsx                 # email/password sign in; signs out non-admins (checks /api/me)
    signup/page.tsx                 # explains admin accounts are invite-only (no form)
    forgot-password/page.tsx        # sends a password-reset email
    auth/set-password/page.tsx      # landing page for admin invites + reset links: choose a password
    dashboard/page.tsx              # protected: companies grid, verification badges, inline Activate buttons
    dashboard/admins/page.tsx       # protected: list/invite/remove admins
    dashboard/register/page.tsx     # protected: invite-a-company form (no password field)
    dashboard/companies/[id]/page.tsx # protected: edit-a-company form + moderation
    api/me/route.ts                 # server-side: "is this session an admin?"
    api/admins/route.ts             # server-side: list admins, invite an admin
    api/admins/[userId]/route.ts    # server-side: remove an admin (not yourself)
    api/register-company/route.ts   # server-side: invites a company + writes the companies row
    api/companies/route.ts          # server-side: lists all companies (service role)
    api/companies/[id]/route.ts     # server-side: get/update one company (service role)
    api/companies/[id]/status/route.ts # server-side: moderation — set pending/active (service role)
  components/NavBar.tsx             # top nav + admin guard (signs out non-admins on every page)
  lib/supabase.ts                   # browser client, getSupabaseAdmin() (service role, server-only), getAuthenticatedUser()
  lib/auth.ts                       # server-only: requireAdmin() (every API route), app URLs, helpers
  lib/password.ts                   # password rules for set-password
```

## Status

Invite-only admin auth (with admins table + server-side checks), admin
invites for companies, company self sign-up with email verification (in
`web/`), password reset, a companies grid with verification status,
per-company editing, and pending/active moderation are implemented. Interview management (create/list/report) still lives in `web/`.
