-- =====================================================================
-- BioPath: General mock exams + more file types + practice questions
--
-- HOW TO RUN: Supabase -> SQL Editor -> New query -> paste this whole
-- file -> Run. Safe to run more than once.
-- (Run it BEFORE using the new features on the website.)
-- =====================================================================

-- ---------------------------------------------------------------------
-- PART 1: General mock exams (not tied to one course)
-- ---------------------------------------------------------------------

-- A general mock has is_general = true and no course.
alter table public.mocks
  add column if not exists is_general boolean not null default false;

alter table public.mocks     alter column course_id drop not null;
alter table public.questions alter column course_id drop not null;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- Every signed-in user can see general mocks
drop policy if exists "Signed-in users can read general mocks" on public.mocks;
create policy "Signed-in users can read general mocks"
  on public.mocks for select to authenticated
  using (is_general = true);

-- Only admins can create / edit / delete general mocks
drop policy if exists "Admins manage general mocks" on public.mocks;
create policy "Admins manage general mocks"
  on public.mocks for all to authenticated
  using (is_general = true and public.is_admin())
  with check (is_general = true and public.is_admin());

-- Questions inside general mocks: everyone reads, only admins change
drop policy if exists "Signed-in users can read general mock questions" on public.questions;
create policy "Signed-in users can read general mock questions"
  on public.questions for select to authenticated
  using (exists (
    select 1 from public.mocks m
    where m.id = questions.mock_id and m.is_general = true
  ));

drop policy if exists "Admins manage general mock questions" on public.questions;
create policy "Admins manage general mock questions"
  on public.questions for all to authenticated
  using (exists (
    select 1 from public.mocks m
    where m.id = questions.mock_id and m.is_general = true and public.is_admin()
  ))
  with check (exists (
    select 1 from public.mocks m
    where m.id = questions.mock_id and m.is_general = true and public.is_admin()
  ));


-- ---------------------------------------------------------------------
-- PART 2: Study materials vs. practice-question documents
-- ---------------------------------------------------------------------

-- 'material' = notes/slides, 'practice' = question papers (PDF/Word/etc.)
alter table public.materials
  add column if not exists category text not null default 'material';

alter table public.materials drop constraint if exists materials_category_check;
alter table public.materials
  add constraint materials_category_check
  check (category in ('material', 'practice'));
