begin;
-- subject_id inherits the exact SQL type used by the existing project.
create table public.kb_chapters as select id as subject_id from public.subjects with no data;
alter table public.kb_chapters add column id uuid primary key default gen_random_uuid(),alter column subject_id set not null,
add foreign key(subject_id) references public.subjects(id),add column title text not null check(length(trim(title))>0),
add column semester int not null check(semester in(1,2)),add column position int not null default 1,add column description text,add column summary text;
create index kb_chapter_subject on public.kb_chapters(subject_id,semester,position);
alter table public.materials add column kb_chapter uuid references public.kb_chapters on delete set null;
alter table public.quizzes add column kb_chapter uuid references public.kb_chapters on delete set null;
alter table public.subjects add column kb_grade text,add column kb_image text;
create table public.kb_banners(id uuid primary key default gen_random_uuid(),title text not null,description text,category text,image text,position int not null default 1,destination text not null);
alter table public.kb_banners enable row level security;
alter table public.kb_chapters enable row level security;
revoke all on public.kb_banners,public.kb_chapters from public,anon,authenticated;
grant select,insert,update,delete on public.kb_banners,public.kb_chapters to authenticated;
create policy banners_read on public.kb_banners for select to authenticated using(true);
create policy chapters_read on public.kb_chapters for select to authenticated using(exists(select from public.subjects s where s.id=subject_id and not s.kb_archived) or public.kb_is_admin());
create policy banners_admin on public.kb_banners for all to authenticated using(public.kb_is_admin()) with check(public.kb_is_admin());
create policy chapters_admin on public.kb_chapters for all to authenticated using(public.kb_is_admin()) with check(public.kb_is_admin());
commit;
