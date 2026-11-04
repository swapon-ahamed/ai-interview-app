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

alter table companies enable row level security;

-- Only the company's own signed-in user may read their row. All writes go
-- through the admin app's server-side API route using the service_role key
-- (which bypasses RLS), so no insert/update policy is defined here.
drop policy if exists "companies_select_own" on companies;
create policy "companies_select_own" on companies
  for select using (auth.uid() = user_id);

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
