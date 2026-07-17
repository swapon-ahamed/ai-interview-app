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

-- Reusable question sets recruiters can pick from when creating an interview
create table if not exists question_templates (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

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
