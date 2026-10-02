-- =====================================================================
-- BioPath: every student gets every course automatically + admin can
-- delete courses.
--
-- HOW TO RUN: Supabase -> SQL Editor -> New query -> paste this whole
-- file -> Run. It is safe to run more than once.
-- =====================================================================


-- ---------------------------------------------------------------------
-- PART 1: Automatic course access (no admin approval needed)
-- ---------------------------------------------------------------------

-- 1a) When a student profile is created (sign up) or a user becomes a
--     student, enroll them in every existing course.
create or replace function public.enroll_student_in_all_courses()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.role, 'student') = 'student' then
    insert into public.student_courses (student_id, course_id)
    select new.id, c.id
    from public.courses c
    where not exists (
      select 1 from public.student_courses sc
      where sc.student_id = new.id and sc.course_id = c.id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists enroll_new_student on public.profiles;
create trigger enroll_new_student
  after insert or update of role on public.profiles
  for each row execute function public.enroll_student_in_all_courses();

-- 1b) When the admin adds a new course, enroll every student in it.
create or replace function public.enroll_all_students_in_course()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.student_courses (student_id, course_id)
  select p.id, new.id
  from public.profiles p
  where coalesce(p.role, 'student') = 'student'
    and not exists (
      select 1 from public.student_courses sc
      where sc.student_id = p.id and sc.course_id = new.id
    );
  return new;
end;
$$;

drop trigger if exists enroll_students_in_new_course on public.courses;
create trigger enroll_students_in_new_course
  after insert on public.courses
  for each row execute function public.enroll_all_students_in_course();

-- 1c) One-time catch-up: give every EXISTING student every EXISTING course.
insert into public.student_courses (student_id, course_id)
select p.id, c.id
from public.profiles p
cross join public.courses c
where coalesce(p.role, 'student') = 'student'
  and not exists (
    select 1 from public.student_courses sc
    where sc.student_id = p.id and sc.course_id = c.id
  );


-- ---------------------------------------------------------------------
-- PART 2: Let the admin delete a course
-- ---------------------------------------------------------------------

-- 2a) Only admins may delete rows in "courses".
drop policy if exists "Admins can delete courses" on public.courses;
create policy "Admins can delete courses"
  on public.courses
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- 2b) Deleting a course must also remove the things that belong to it
--     (its mock exams, questions, results, student/lecturer assignments).
--     This switches every foreign key that points at "courses" or "mocks"
--     to ON DELETE CASCADE. Without it, Postgres refuses to delete a
--     course that still has mocks or students.
do $$
declare
  r record;
  new_def text;
begin
  for r in
    select c.conname,
           c.conrelid::regclass::text as tbl,
           pg_get_constraintdef(c.oid) as def
    from pg_constraint c
    where c.contype = 'f'
      and c.confrelid in ('public.courses'::regclass, 'public.mocks'::regclass)
      and c.confdeltype <> 'c'          -- skip ones that already cascade
  loop
    new_def := regexp_replace(
      r.def, '\s+ON DELETE (NO ACTION|RESTRICT|SET NULL|SET DEFAULT)', '', 'gi'
    );
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
    execute format(
      'alter table %s add constraint %I %s on delete cascade',
      r.tbl, r.conname, new_def
    );
  end loop;
end;
$$;
