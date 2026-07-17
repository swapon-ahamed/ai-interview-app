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
