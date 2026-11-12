-- Run this in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run

-- Leads from the public /book-demo marketing page (web/app/api/demo-requests
-- POST, no auth — this is a public lead-gen form). Nothing reads this table
-- yet; it exists so submissions aren't lost while that admin view is built.
create table if not exists demo_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  work_email text not null,
  company_name text not null,
  roles_per_month text not null,
  roles_hiring_for text,
  created_at timestamptz not null default now()
);

create table if not exists interviews (
  id uuid primary key default gen_random_uuid(),
  room_name text unique not null,
  candidate_name text not null,
  job_role text not null,
  questions jsonb not null default '[]'::jsonb,
  status text not null default 'created', -- created | in_progress | completed
  transcript jsonb,
  score jsonb, -- filled in Step 5 (evaluation)
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_interviews_room_name on interviews (room_name);

-- Which company (Supabase Auth user, see companies table) created this
-- interview — nullable so interviews created before company login existed
-- still work. Set by web/app/api/interviews POST, filtered on by its GET.
alter table interviews add column if not exists user_id uuid references auth.users (id);
create index if not exists idx_interviews_user_id on interviews (user_id);

-- Candidate link validity window + hard session length. Set by
-- web/app/api/interviews POST (company flow) and web/app/api/practice POST
-- (self-serve practice flow); enforced by web/app/api/token (window) and
-- agent/main.py's enforce_duration() (length).
alter table interviews add column if not exists scheduled_start timestamptz;
alter table interviews add column if not exists scheduled_end timestamptz;
alter table interviews add column if not exists duration_minutes int not null default 2;

-- 'practice' rows come from the free, no-signup /practice flow (no company,
-- no scheduling gate beyond a generous default window) — kept distinct from
-- 'company' rows so the public practice results API
-- (web/app/api/practice/[roomName]) can never expose a real company's
-- interview data, even if someone guesses a room name.
-- Values: 'company' | 'practice' (enforced in application code, same
-- convention as companies.status below — no db-level check constraint).
alter table interviews add column if not exists mode text not null default 'company';

-- Reusable question sets recruiters can pick from when creating an interview.
-- Also doubles as the public catalog for the free self-serve practice mode
-- (web/app/practice) — see the `skills`/`duration_minutes` columns below.
create table if not exists question_templates (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Short skill tags shown on practice-catalog cards (e.g. ["API design",
-- "Debugging", "System tradeoffs"]) — distinct from `questions`, which are
-- full instructions to the AI interviewer, not display labels.
alter table question_templates add column if not exists skills jsonb not null default '[]'::jsonb;

-- Practice sessions default to a short, focused length rather than a full
-- interview; real company interviews keep setting their own duration_minutes
-- on the `interviews` row itself (see web/app/api/interviews POST).
alter table question_templates add column if not exists duration_minutes int not null default 6;

-- URL-friendly identifier for the public practice-catalog route
-- (web/app/practice/[slug]). Backfilled from `role` below for any existing
-- rows; new rows created via admin/dashboard/templates must set their own.
alter table question_templates add column if not exists slug text;

update question_templates
set slug = lower(regexp_replace(regexp_replace(role, '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
where slug is null;

-- The original seed INSERT (below) had no unique constraint to conflict on,
-- so re-running this file in the past could have created duplicate role
-- rows (e.g. two "Data Analyst" templates). Clean those up — keeping the
-- oldest row per slug — before the unique index can be created. A no-op
-- once the catalog has no duplicates left.
delete from question_templates a
using question_templates b
where a.slug = b.slug
  and (a.created_at, a.id) > (b.created_at, b.id);

create unique index if not exists idx_question_templates_slug on question_templates (slug);

-- Company profiles for admin accounts. One row per Supabase Auth user (auth.users);
-- the user's email/password themselves live only in Supabase Auth's own encrypted
-- storage — they are never duplicated here.
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  email text not null,
  company_name text not null,
  mobile_number text not null,
  contact_address text,
  created_at timestamptz not null default now()
);

-- Moderation: every new company starts 'pending' until an admin activates it
-- from admin/dashboard/companies/[id] (regardless of whether they've also
-- confirmed their email — those are two separate gates).
alter table companies add column if not exists status text not null default 'pending';

create index if not exists idx_companies_user_id on companies (user_id);

-- How the account was created: 'self_signup' (public web/signup, email
-- verified by the company itself) or 'admin_invite' (admin/dashboard/register,
-- email verified by accepting the invite). Older rows default to the latter.
alter table companies add column if not exists signup_source text not null default 'admin_invite';

alter table companies enable row level security;

-- Only the company's own signed-in user may read their row. All writes go
-- through the admin app's server-side API route using the service_role key
-- (which bypasses RLS), so no insert/update policy is defined here.
drop policy if exists "companies_select_own" on companies;
create policy "companies_select_own" on companies
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Account types: admins (invite-only) vs companies
-- ---------------------------------------------------------------------------
-- An admin is exactly a Supabase Auth user with a row here. Every admin/ API
-- route checks this table server-side (admin/lib/supabase.ts requireAdmin),
-- and admin/ signs out anyone who isn't listed. Rows are only created by
-- an existing admin's invite (admin/app/api/admins) — there is no public
-- admin signup. Server-only (RLS on, no policies).
create table if not exists admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table admins enable row level security;

-- Bootstrapping the FIRST admin (one-time, after creating that user in
-- Supabase Dashboard -> Authentication -> Users -> "Add user"):
--   insert into admins (user_id, email)
--   select id, email from auth.users where email = 'you@example.com';

-- Lock down every other public table. All access to these goes through
-- server-side code using the service_role key (web/ and admin/ API routes,
-- agent/main.py), which bypasses RLS — so enabling RLS with NO policies
-- denies the anon/authenticated keys entirely without affecting the apps.
-- Without this, anyone holding the public anon key (shipped to every browser)
-- could read/edit/delete these tables directly via the Supabase REST API.
-- If a client component ever needs direct access, add a narrow policy here.
alter table interviews enable row level security;
alter table question_templates enable row level security;
alter table demo_requests enable row level security;

-- ---------------------------------------------------------------------------
-- Free practice: candidate details + attempt cap
-- ---------------------------------------------------------------------------
-- One row per email that has started a free practice session (web/app/api/
-- practice POST). attempts_used is the authoritative counter for the
-- per-candidate cap — it's only ever changed through claim_practice_attempt()
-- / release_practice_attempt() below so concurrent requests can't race past it.
create table if not exists practice_candidates (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique, -- stored lowercased/trimmed by the API
  phone text not null,        -- stored normalized: digits with optional leading +
  attempts_used int not null default 0,
  created_at timestamptz not null default now(),
  last_attempt_at timestamptz
);

create index if not exists idx_practice_candidates_phone on practice_candidates (phone);
alter table practice_candidates enable row level security; -- service_role only

-- Links a practice interview to the candidate who took it, and which of their
-- attempts it was (1..max). Null for company interviews.
alter table interviews add column if not exists practice_candidate_id uuid
  references practice_candidates (id) on delete set null;
alter table interviews add column if not exists attempt_number int;
create index if not exists idx_interviews_practice_candidate_id on interviews (practice_candidate_id);

-- Atomically upserts the candidate and consumes one attempt if they have any
-- left. The cap applies per email AND per phone (summed across every email
-- that used that phone), so swapping email alone doesn't reset it.
-- Returns {"ok": true, "candidate_id", "attempt_number", "remaining"} or
-- {"ok": false, "candidate_id", "remaining": 0}.
create or replace function claim_practice_attempt(
  p_email text, p_full_name text, p_phone text, p_max int
) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_id uuid;
  v_used int;
  v_phone_used int;
begin
  -- Serialize claims for the same phone number so two different emails
  -- sharing one phone can't both slip under the cap concurrently.
  perform pg_advisory_xact_lock(hashtext('practice_phone:' || p_phone));

  insert into practice_candidates (full_name, email, phone)
  values (p_full_name, p_email, p_phone)
  on conflict (email) do update
    set full_name = excluded.full_name, phone = excluded.phone
  returning id into v_id;

  select coalesce(sum(attempts_used), 0) into v_phone_used
  from practice_candidates
  where phone = p_phone and id <> v_id;

  update practice_candidates
  set attempts_used = attempts_used + 1, last_attempt_at = now()
  where id = v_id
    and attempts_used < p_max
    and attempts_used + v_phone_used < p_max
  returning attempts_used into v_used;

  if v_used is null then
    return jsonb_build_object('ok', false, 'candidate_id', v_id, 'remaining', 0);
  end if;

  return jsonb_build_object(
    'ok', true,
    'candidate_id', v_id,
    'attempt_number', v_used,
    'remaining', greatest(p_max - v_used - v_phone_used, 0)
  );
end;
$$;

-- Gives an attempt back when the session couldn't actually be started
-- (e.g. LiveKit room creation failed after the attempt was claimed).
create or replace function release_practice_attempt(p_candidate_id uuid)
returns void
language sql
set search_path = public
as $$
  update practice_candidates
  set attempts_used = greatest(attempts_used - 1, 0)
  where id = p_candidate_id;
$$;

-- ---------------------------------------------------------------------------
-- Rate limiting (shared across all web/ server instances)
-- ---------------------------------------------------------------------------
-- Fixed-window counters keyed by e.g. "practice:ip:1.2.3.4" or
-- "practice:global". Used by web/lib/rateLimit.ts for the expensive
-- endpoints (each practice session costs LiveKit + OpenAI usage), on top of
-- the cheaper per-instance in-memory limiter in web/middleware.ts.
create table if not exists rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count int not null default 0
);
alter table rate_limits enable row level security; -- service_role only

-- Records one hit against p_key and returns the count within the current
-- window plus when that window resets. Caller decides allow/deny.
create or replace function hit_rate_limit(p_key text, p_window_seconds int)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_count int;
  v_start timestamptz;
begin
  insert into rate_limits as r (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update set
    count = case when r.window_start <= now() - make_interval(secs => p_window_seconds)
                 then 1 else r.count + 1 end,
    window_start = case when r.window_start <= now() - make_interval(secs => p_window_seconds)
                        then now() else r.window_start end
  returning count, window_start into v_count, v_start;

  -- Opportunistic cleanup so per-IP keys don't accumulate forever.
  if random() < 0.01 then
    delete from rate_limits where window_start < now() - interval '2 days';
  end if;

  return jsonb_build_object(
    'count', v_count,
    'reset_at', v_start + make_interval(secs => p_window_seconds)
  );
end;
$$;

-- Functions in `public` are callable through Supabase's REST API (/rpc) by
-- default. Only the server (service_role) may call these.
revoke execute on function claim_practice_attempt(text, text, text, int) from public, anon, authenticated;
revoke execute on function release_practice_attempt(uuid) from public, anon, authenticated;
revoke execute on function hit_rate_limit(text, int) from public, anon, authenticated;
grant execute on function claim_practice_attempt(text, text, text, int) to service_role;
grant execute on function release_practice_attempt(uuid) to service_role;
grant execute on function hit_rate_limit(text, int) to service_role;

-- Backfill skills for the three original seed roles if they were inserted
-- before the `skills` column existed and haven't been edited since (guards
-- against clobbering admin edits on a re-run).
update question_templates set skills = '["API design", "Debugging under pressure", "System tradeoffs"]'::jsonb
  where role = 'Backend Software Engineer' and skills = '[]'::jsonb;
update question_templates set skills = '["Accessibility", "Performance tuning", "UI collaboration"]'::jsonb
  where role = 'Frontend Software Engineer' and skills = '[]'::jsonb;
update question_templates set skills = '["Root-cause analysis", "Stakeholder communication", "Handling pushback"]'::jsonb
  where role = 'Data Analyst' and skills = '[]'::jsonb;

-- Seed catalog for both company interview creation (web/dashboard/create-interview)
-- and the free self-serve practice mode (web/app/practice). Practice sessions
-- run short (6 min) by design — a focused warm-up, not a full-length interview.
insert into question_templates (role, slug, skills, duration_minutes, questions) values
('Backend Software Engineer', 'backend-software-engineer',
 '["API design", "Debugging under pressure", "System tradeoffs"]'::jsonb, 6, '[
  "Ask the candidate to briefly introduce themselves and their background.",
  "Ask them to explain how they would design a REST API for a simple e-commerce cart.",
  "Ask how they would debug a production API endpoint that suddenly got slow.",
  "Ask about a time they disagreed with a teammate on a technical decision and how they handled it.",
  "Thank the candidate and let them know the interview is complete."
]'::jsonb),
('Frontend Software Engineer', 'frontend-software-engineer',
 '["Accessibility", "Performance tuning", "UI collaboration"]'::jsonb, 6, '[
  "Ask the candidate to briefly introduce themselves and their background.",
  "Ask how they would approach making a web page accessible for screen readers.",
  "Ask about a time they had to optimize a slow-rendering React component.",
  "Ask about a time they disagreed with a designer over a UI decision and how they resolved it.",
  "Thank the candidate and let them know the interview is complete."
]'::jsonb),
('Data Analyst', 'data-analyst',
 '["Root-cause analysis", "Stakeholder communication", "Handling pushback"]'::jsonb, 6, '[
  "Ask the candidate to briefly introduce themselves and their background.",
  "Ask them to walk through how they would investigate a sudden drop in a key metric.",
  "Ask how they explain a complex analysis to a non-technical stakeholder.",
  "Ask about a time their analysis was challenged and how they responded.",
  "Thank the candidate and let them know the interview is complete."
]'::jsonb),
('Product Manager', 'product-manager',
 '["Prioritization", "Cross-team alignment", "Metrics-driven decisions"]'::jsonb, 6, '[
  "Ask the candidate to briefly introduce themselves and their background.",
  "Ask how they would decide what to cut from a roadmap when a deadline gets pulled in.",
  "Ask about a metric they would track to know a recent feature is actually working.",
  "Ask about a time engineering and design disagreed on scope and how they resolved it.",
  "Thank the candidate and let them know the interview is complete."
]'::jsonb),
('Customer Support Specialist', 'customer-support-specialist',
 '["De-escalation", "Clear writing", "Empathy under pressure"]'::jsonb, 6, '[
  "Ask the candidate to briefly introduce themselves and their background.",
  "Ask how they would respond to an angry customer who feels ignored after multiple contacts.",
  "Ask how they would explain a confusing policy limitation without sounding dismissive.",
  "Ask about a time they had to stay calm while a customer was upset with them personally.",
  "Thank the candidate and let them know the interview is complete."
]'::jsonb),
('DevOps Engineer', 'devops-engineer',
 '["Incident response", "Automation mindset", "Infrastructure tradeoffs"]'::jsonb, 6, '[
  "Ask the candidate to briefly introduce themselves and their background.",
  "Ask how they would triage a production outage in the first five minutes.",
  "Ask what they would automate first on a team that still deploys manually.",
  "Ask about a time a quick fix caused a bigger problem later and what they learned.",
  "Thank the candidate and let them know the interview is complete."
]'::jsonb),
('UX Designer', 'ux-designer',
 '["User research", "Design rationale", "Feedback handling"]'::jsonb, 6, '[
  "Ask the candidate to briefly introduce themselves and their background.",
  "Ask how they would validate a design decision when there is no time for a full research study.",
  "Ask them to explain a design choice they made that stakeholders initially pushed back on.",
  "Ask about a time user feedback contradicted their own instincts and what they did.",
  "Thank the candidate and let them know the interview is complete."
]'::jsonb),
('Marketing Coordinator', 'marketing-coordinator',
 '["Campaign planning", "Data-informed creativity", "Cross-functional coordination"]'::jsonb, 6, '[
  "Ask the candidate to briefly introduce themselves and their background.",
  "Ask how they would plan a campaign launch with a tight budget and a fixed deadline.",
  "Ask how they decide a campaign is worth repeating versus retiring.",
  "Ask about a time they had to get sign-off from multiple teams and how they kept it moving.",
  "Thank the candidate and let them know the interview is complete."
]'::jsonb)
on conflict (slug) do nothing;
