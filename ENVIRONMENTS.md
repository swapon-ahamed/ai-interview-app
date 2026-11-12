# Environments: development & production

| | **Development** | **Production** |
|---|---|---|
| Web (`web/`) | `http://localhost:3000` (`npm run dev`) | **https://ai-interview.swapon-ahamed.me** (AWS Amplify `ai-interview-web`) |
| Admin (`admin/`) | `http://localhost:3001` (`npm run dev`) | **https://ai-interview-admin.swapon-ahamed.me** (AWS Amplify `ai-interview-admin`) |
| Agent (`agent/`) | your machine: `python main.py dev` | AWS Lightsail (`agent/DEPLOYMENT.md`), `APP_ENV=production` |
| Agent worker name | `ai-interviewer-dev` | `ai-interviewer-prod` |
| Supabase project | **ai-interview-dev** (new) | **ai-interview-app** (the original project, real data) |
| LiveKit Cloud | shared project | shared project |
| `NEXT_PUBLIC_APP_ENV` | `development` | `production` (only value that allows search indexing) |

## Why LiveKit is shared but still isolated

Both environments use one LiveKit Cloud project. Each agent registers under its
own **worker name** (`agent/main.py` → `WORKER_NAME`), and the web app
**explicitly dispatches** that name when it creates a room
(`web/lib/livekit.ts`, `LIVEKIT_AGENT_NAME`). A room created by local dev is
only offered to `ai-interviewer-dev`; a production room only to
`ai-interviewer-prod`. Verified: a room dispatched to one name is never joined
by the other environment's agent.

Consequence: **web and agent must agree on the name.** If production web asks
for `ai-interviewer-prod` and no worker with that name is running, the room
gets no interviewer.

## Where configuration lives

Next.js loads env files by mode (`next dev` → development, `next build`/`start` →
production). Real environment variables override all files; the Amplify
build also appends its env vars to `.env.production`, so Amplify values win.

| File | Committed? | Contents |
|---|---|---|
| `web/.env.development`, `web/.env.production` | **yes** | non-secret: app URLs, `NEXT_PUBLIC_APP_ENV`, `LIVEKIT_AGENT_NAME` |
| `admin/.env.development`, `admin/.env.production` | **yes** | non-secret: app URLs, `NEXT_PUBLIC_APP_ENV` |
| `web/.env.development.local`, `admin/.env.development.local` | no | dev secrets (dev Supabase, LiveKit) |
| `web/.env.production.local`, `admin/.env.production.local` | no | prod secrets, only for a *local* production build |
| `/.env.development`, `/.env.production` (repo root) | no | agent secrets per environment |
| `*.env.example` | yes | templates listing every secret each file needs |

Never put a secret in a committed file. The `.local` and root `.env.*` files
are gitignored.

## One-time setup

### 1. Development Supabase project — done

Created **`ai-interview-dev`** (ref `xzgnrmporluzmszlpqqk`, Singapore,
`https://xzgnrmporluzmszlpqqk.supabase.co`) in the same org, Free plan.
`supabase/schema.sql` has been applied (all tables RLS-protected, practice
roles seeded), and Auth → URL Configuration has Site URL
`http://localhost:3000` with redirect URLs `http://localhost:3000/**` and
`http://localhost:3001/**`. The project URL is already in all three local dev
env files.

Remaining (secrets — do it yourself):

1. Open **Settings → API Keys → Legacy API keys** for `ai-interview-dev`, and
   paste into the repo-root **`.env.development`**: `anon public` →
   `SUPABASE_ANON_KEY`, `service_role secret` (Reveal) → `SUPABASE_SERVICE_ROLE_KEY`.
2. Run `python3 scripts/sync-dev-env.py` — copies them into
   `web/.env.development.local` and `admin/.env.development.local` (never
   prints values; refuses if the URL is the production project).
3. Create your dev admin: Authentication → Users → *Add user* (tick
   auto-confirm), then in the dev SQL Editor:
   `insert into admins (user_id, email) select id, email from auth.users where email = 'you@example.com';`

Until step 2 is done, `npm run dev` stops with "Missing
NEXT_PUBLIC_SUPABASE_ANON_KEY…" — deliberately: development never falls back
to the production database.

### 2. Configure the production Supabase project (ai-interview-app)

1. Authentication → **URL Configuration**: Site URL
   `https://ai-interview.swapon-ahamed.me`; Redirect URLs
   `https://ai-interview.swapon-ahamed.me/**` and
   `https://ai-interview-admin.swapon-ahamed.me/**`. Remove the localhost
   entries once local development uses the dev project.
2. Authentication → Emails → **SMTP Settings**: connect a real provider
   (Resend, SendGrid, Postmark, SES, Brevo…). Use a sender on your domain, e.g.
   `no-reply@ai-interview.swapon-ahamed.me`, and add the provider's SPF/DKIM DNS
   records. Without this, verification/invite/reset emails only reach your
   Supabase team members.
3. Make sure the latest `supabase/schema.sql` has been run, and that the
   `admins` table has your production admin (see `admin/README.md`).

### 3. Frontends on AWS Amplify (region ap-southeast-1)

| Amplify app | App root | Branch | Domain |
|---|---|---|---|
| `ai-interview-web` (`d2yalx86n66yt0`) | `web` | `master` | `ai-interview.swapon-ahamed.me` |
| `ai-interview-admin` (`d1ilpm9uvdo0kn`) | `admin` | `master` | `ai-interview-admin.swapon-ahamed.me` |

Both auto-build on every push to **`master`** (the production branch; `main` is
merged into it to release). DNS is Route 53 in the same AWS account and is
managed by Amplify's domain association; certificates are automatic.

Secrets are the apps' Amplify **Environment variables** (prod Supabase,
LiveKit). The build spec runs `env | grep -e LIVEKIT_ -e SUPABASE_ -e NEXT_PUBLIC_ >> .env.production`
before `npm run build`, so those values are appended to the committed
`web/.env.production` / `admin/.env.production` and win over them. Values not
set in Amplify — `LIVEKIT_AGENT_NAME=ai-interviewer-prod`,
`NEXT_PUBLIC_APP_ENV=production` — come from the committed files.

### 4. Switch the production agent to its worker name

Done on 2026-11-11 together with the first named-dispatch web release. Kept
here for reference / rebuilding the server. The private key isn't needed: get
a temporary one with `aws lightsail get-instance-access-details
--instance-name ai-interview-agent --protocol ssh --region ap-southeast-1`
(see `agent/DEPLOYMENT.md`). On the Lightsail instance:

```bash
# from the repo root on your machine
scp -i ai-interview-agent-key.pem agent/main.py agent/requirements.txt \
  ubuntu@54.251.101.13:~/ai-interview-app/agent/
scp -i ai-interview-agent-key.pem .env.production \
  ubuntu@54.251.101.13:~/ai-interview-app/.env.production
scp -i ai-interview-agent-key.pem agent/ai-interview-agent.service \
  ubuntu@54.251.101.13:/tmp/ai-interview-agent.service

ssh -i ai-interview-agent-key.pem ubuntu@54.251.101.13 "
  chmod 600 ~/ai-interview-app/.env.production &&
  rm -f ~/ai-interview-app/.env &&
  sudo mv /tmp/ai-interview-agent.service /etc/systemd/system/ai-interview-agent.service &&
  sudo systemctl daemon-reload &&
  cd ~/ai-interview-app/agent && source venv/bin/activate && pip install -r requirements.txt &&
  sudo systemctl restart ai-interview-agent &&
  sleep 15 && grep 'registered worker' ~/ai-interview-app/agent/agent.log | tail -1
"
```

The last line must show `"agent_name": "ai-interviewer-prod"`.

## Day-to-day

```bash
# Development (all three, each in its own terminal)
cd web && npm run dev            # http://localhost:3000, dev Supabase
cd admin && npm run dev          # http://localhost:3001, dev Supabase
cd agent && source venv/bin/activate && python main.py dev   # worker ai-interviewer-dev

# Production
git checkout master && git merge main && git push origin master   # Amplify builds web + admin
# agent: see agent/DEPLOYMENT.md "Redeploying after a code change"
```

**Schema changes:** edit `supabase/schema.sql`, run it in the **dev** project,
test, then run the same file in the **production** project when you deploy.
It's idempotent, so re-running is safe.
