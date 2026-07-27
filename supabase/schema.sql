-- Run this in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run

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

-- Reusable question sets recruiters can pick from when creating an interview
create table if not exists question_templates (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

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

insert into question_templates (role, questions) values
('Backend Software Engineer', '[
  "Ask the candidate to briefly introduce themselves and their background.",
  "Ask them to explain how they would design a REST API for a simple e-commerce cart.",
  "Ask how they would debug a production API endpoint that suddenly got slow.",
  "Ask about a time they disagreed with a teammate on a technical decision and how they handled it.",
  "Thank the candidate and let them know the interview is complete."
]'::jsonb),
('Frontend Software Engineer', '[
  "Ask the candidate to briefly introduce themselves and their background.",
  "Ask how they would approach making a web page accessible for screen readers.",
  "Ask about a time they had to optimize a slow-rendering React component.",
  "Ask about a time they disagreed with a designer over a UI decision and how they resolved it.",
  "Thank the candidate and let them know the interview is complete."
]'::jsonb),
('Data Analyst', '[
  "Ask the candidate to briefly introduce themselves and their background.",
  "Ask them to walk through how they would investigate a sudden drop in a key metric.",
  "Ask how they explain a complex analysis to a non-technical stakeholder.",
  "Ask about a time their analysis was challenged and how they responded.",
  "Thank the candidate and let them know the interview is complete."
]'::jsonb)
on conflict do nothing;
