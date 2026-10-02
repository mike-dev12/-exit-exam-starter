-- =====================================================================
-- BioPath: Study Materials (PDF / PowerPoint files per course)
--
-- HOW TO RUN: Supabase -> SQL Editor -> New query -> paste this whole
-- file -> Run. Safe to run more than once.
-- =====================================================================

-- Who may upload/delete materials for a course: admins, and lecturers
-- assigned to that course.
create or replace function public.can_manage_course(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.role = 'admin')
    or exists (select 1 from public.lecturer_courses lc
               where lc.lecturer_id = auth.uid() and lc.course_id = cid);
$$;

-- One row per uploaded file
create table if not exists public.materials (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  title       text not null,
  file_path   text not null,          -- path inside the storage bucket
  file_name   text not null,          -- original file name
  file_type   text,                   -- 'pdf' | 'ppt' | 'pptx'
  file_size   bigint,
  uploaded_by uuid references auth.users(id),
  created_at  timestamptz default now()
);

create index if not exists materials_course_idx on public.materials (course_id);

alter table public.materials enable row level security;

drop policy if exists "Signed-in users can read materials" on public.materials;
create policy "Signed-in users can read materials"
  on public.materials for select to authenticated
  using (true);

drop policy if exists "Course managers can add materials" on public.materials;
create policy "Course managers can add materials"
  on public.materials for insert to authenticated
  with check (public.can_manage_course(course_id));

drop policy if exists "Course managers can delete materials" on public.materials;
create policy "Course managers can delete materials"
  on public.materials for delete to authenticated
  using (public.can_manage_course(course_id));

-- Private storage bucket (files are opened through short-lived signed links,
-- so only signed-in users can read them). 50 MB per file.
insert into storage.buckets (id, name, public, file_size_limit)
values ('course-materials', 'course-materials', false, 52428800)
on conflict (id) do update set public = false;

-- Files are stored as  <course_id>/<timestamp>-<file name>
drop policy if exists "Signed-in users can read material files" on storage.objects;
create policy "Signed-in users can read material files"
  on storage.objects for select to authenticated
  using (bucket_id = 'course-materials');

drop policy if exists "Course managers can upload material files" on storage.objects;
create policy "Course managers can upload material files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'course-materials'
    and public.can_manage_course(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "Course managers can delete material files" on storage.objects;
create policy "Course managers can delete material files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'course-materials'
    and public.can_manage_course(((storage.foldername(name))[1])::uuid)
  );
