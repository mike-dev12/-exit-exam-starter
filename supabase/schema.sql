-- Run this in Supabase: Project -> SQL Editor -> New query

-- Questions table (lecturer/admin fills this in)
create table questions (
  id uuid primary key default gen_random_uuid(),
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text,
  option_d text,
  correct_option text not null check (correct_option in ('A','B','C','D')),
  subject text,
  created_at timestamp with time zone default now()
);

-- Results table (one row per completed quiz attempt)
create table results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references auth.users(id) not null,
  score int not null,
  total_questions int not null,
  taken_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table questions enable row level security;
alter table results enable row level security;

-- Anyone logged in can read questions
create policy "Authenticated users can read questions"
  on questions for select
  using (auth.role() = 'authenticated');

-- Students can insert their own results
create policy "Students can insert their own results"
  on results for insert
  with check (auth.uid() = student_id);

-- Students can read only their own results
create policy "Students can read their own results"
  on results for select
  using (auth.uid() = student_id);
