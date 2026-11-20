begin;

-- Struktur minimum berdasarkan query versi lama. Transaksi berhenti jika skema berbeda.
do $$
declare item record;
begin
  for item in select * from (values
    ('profiles','id,role,full_name'),('subjects','id,name,description,created_at'),
    ('materials','id,subject_id,title,description,content,created_at'),
    ('quizzes','id,subject_id,title,description,created_at'),
    ('questions','quiz_id,question_text,options,correct_answer'),
    ('quiz_results','id,quiz_id,student_id,score,completed_at'),
    ('progress','material_id,student_id,completed,updated_at')
  ) as v(table_name, columns) loop
    if exists (
      select 1 from unnest(string_to_array(item.columns,',')) as needed(col)
      where not exists (
        select 1 from information_schema.columns c where c.table_schema='public'
        and c.table_name=item.table_name and c.column_name=needed.col
      )
    ) then raise exception 'Skema lama tidak cocok pada tabel %',item.table_name; end if;
  end loop;
end $$;

create or replace function public.kb_is_admin() returns boolean
language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin') $$;
revoke all on function public.kb_is_admin() from public,anon;
grant execute on function public.kb_is_admin() to authenticated,anon;

create table if not exists public.site_config (
  key text primary key, value jsonb not null default '{}', updated_at timestamptz not null default now()
);
create table if not exists public.features (
  id uuid primary key default gen_random_uuid(), title text not null, description text,
  icon text default 'star', theme text default 'sky', content text,
  created_at timestamptz not null default now()
);
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(), owner_type text not null check (owner_type in ('material','feature')),
  owner_id text not null, kind text not null check (kind in ('file','video','link')), title text,
  url text not null, path text, created_at timestamptz not null default now()
);
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(), title text not null, content text not null default '', created_at timestamptz not null default now()
);
alter table public.announcements add column if not exists kb_message text;
alter table public.announcements add column if not exists created_at timestamptz not null default now();
alter table public.attachments add column if not exists kb_bucket text;
alter table public.materials add column if not exists kb_category text;
alter table public.materials add column if not exists kb_recommended boolean not null default false;
alter table public.questions add column if not exists kb_id uuid not null default gen_random_uuid();
alter table public.questions add column if not exists kb_correct_index integer;
create unique index if not exists kb_questions_id on public.questions(kb_id);
create index if not exists kb_attachments_owner on public.attachments(owner_type,owner_id);

do $$
declare t text;
begin
  foreach t in array array['subjects','materials','quizzes','features','announcements'] loop
    execute format('alter table public.%I add column if not exists kb_archived boolean not null default false',t);
  end loop;
  foreach t in array array['subjects','materials','quizzes','features','announcements','site_config','attachments','questions'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon',t);
    execute format('revoke truncate, references, trigger on public.%I from authenticated',t);
    execute format('grant select, insert, update on public.%I to authenticated',t);
    execute format('drop policy if exists kb_read on public.%I',t);
    execute format('drop policy if exists kb_admin on public.%I',t);
    execute format('create policy kb_admin on public.%I for all to authenticated using (public.kb_is_admin()) with check (public.kb_is_admin())',t);
    if t <> 'questions' then
      execute format('create policy kb_read on public.%I for select to authenticated using (true)',t);
    end if;
    execute format('drop policy if exists kb_insert_guard on public.%I',t);
    execute format('drop policy if exists kb_update_guard on public.%I',t);
    execute format('drop policy if exists kb_delete_guard on public.%I',t);
    execute format('create policy kb_insert_guard on public.%I as restrictive for insert to authenticated with check (public.kb_is_admin())',t);
    execute format('create policy kb_update_guard on public.%I as restrictive for update to authenticated using (public.kb_is_admin()) with check (public.kb_is_admin())',t);
    execute format('create policy kb_delete_guard on public.%I as restrictive for delete to authenticated using (public.kb_is_admin())',t);
    if t in ('questions','attachments') then
      execute format('grant delete on public.%I to authenticated',t);
    else
      execute format('revoke delete on public.%I from authenticated',t);
    end if;
    if t in ('subjects','materials','quizzes','features','announcements') then
      execute format('drop policy if exists kb_archive_guard on public.%I',t);
      execute format('create policy kb_archive_guard on public.%I as restrictive for select to authenticated using (public.kb_is_admin() or not kb_archived%s)',t,
        case when t in ('materials','quizzes') then format(' and exists(select 1 from public.subjects s where s.id=%I.subject_id and not s.kb_archived)',t) else '' end);
    end if;
  end loop;
end $$;

drop policy if exists kb_question_guard on public.questions;
create policy kb_question_guard on public.questions as restrictive for select to authenticated using (public.kb_is_admin());
drop policy if exists kb_attachment_guard on public.attachments;
create policy kb_attachment_guard on public.attachments as restrictive for select to authenticated using (
  public.kb_is_admin() or
  owner_type='material' and exists(select 1 from public.materials m where m.id::text=owner_id and not m.kb_archived)
  or owner_type='feature' and exists(select 1 from public.features f where f.id::text=owner_id and not f.kb_archived)
);

-- Tutup akses klien untuk mengubah role dan menyisipkan skor.
-- Trigger pendaftaran milik database tetap dapat membuat profil siswa.
alter table public.profiles enable row level security;
alter table public.quiz_results enable row level security;
alter table public.progress enable row level security;
revoke all on public.profiles,public.quiz_results,public.progress from public,anon,authenticated;
grant select on public.profiles,public.quiz_results,public.progress to authenticated;

do $$
declare t text; owner_col text; c record;
begin
  -- REVOKE di level tabel tidak menghapus grant kolom lama.
  for c in select distinct table_name,column_name from information_schema.column_privileges
    where table_schema='public' and grantee in ('PUBLIC','anon','authenticated')
    and table_name in ('profiles','quiz_results','progress','questions')
  loop
    execute format('revoke insert (%I), update (%I), references (%I), select (%I) on public.%I from public,anon,authenticated',c.column_name,c.column_name,c.column_name,c.column_name,c.table_name);
  end loop;
  foreach t in array array['profiles','quiz_results','progress'] loop
    owner_col:=case when t='profiles' then 'id' else 'student_id' end;
    execute format('drop policy if exists kb_own_read on public.%I',t);
    execute format('drop policy if exists kb_own_guard on public.%I',t);
    execute format('create policy kb_own_read on public.%I for select to authenticated using (%I=auth.uid() or public.kb_is_admin())',t,owner_col);
    execute format('create policy kb_own_guard on public.%I as restrictive for select to authenticated using (%I=auth.uid() or public.kb_is_admin())',t,owner_col);
  end loop;
end $$;

create schema if not exists kb_private;
revoke all on schema kb_private from public,anon,authenticated;

-- Supabase Auth boleh membuat profil baru. Metadata pendaftaran tidak boleh menaikkan role.
create or replace function kb_private.guard_signup_role() returns trigger
language plpgsql set search_path='' as $$
begin
  if session_user in ('supabase_auth_admin','authenticator') then
    if tg_op='INSERT' then new.role:='student';
    elsif new.role is distinct from old.role then
      raise exception 'Role profil hanya dapat diubah dari database';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists kb_guard_signup_role on public.profiles;
create trigger kb_guard_signup_role before insert or update of role on public.profiles
  for each row execute function kb_private.guard_signup_role();

create table if not exists kb_private.quiz_attempts (
  id uuid primary key default gen_random_uuid(), student_id uuid not null references auth.users(id) on delete cascade,
  quiz_id text not null, items jsonb not null, expires_at timestamptz not null default now()+interval '1 day',
  score integer, correct_count integer, finished_at timestamptz
);
create index if not exists kb_attempt_owner on kb_private.quiz_attempts(student_id,quiz_id,expires_at) where score is null;

create table if not exists public.kb_material_activity (
  student_id uuid not null references auth.users(id) on delete cascade,
  material_id text not null, opened_at timestamptz, bookmarked_at timestamptz,
  primary key (student_id,material_id)
);
create table if not exists public.kb_agenda (
  id uuid primary key default gen_random_uuid(), student_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 180),
  due_on date, completed boolean not null default false, legacy_ref text
);
alter table public.kb_agenda add column if not exists legacy_ref text;
create unique index if not exists kb_agenda_legacy_ref on public.kb_agenda(student_id,legacy_ref);
alter table public.kb_material_activity enable row level security;
alter table public.kb_agenda enable row level security;
revoke all on public.kb_material_activity,public.kb_agenda from public,anon,authenticated;
grant select on public.kb_material_activity to authenticated;
grant select,insert,update,delete on public.kb_agenda to authenticated;
drop policy if exists kb_activity_owner on public.kb_material_activity;
create policy kb_activity_owner on public.kb_material_activity for select to authenticated using (student_id=auth.uid());
drop policy if exists kb_agenda_owner on public.kb_agenda;
create policy kb_agenda_owner on public.kb_agenda for all to authenticated using (student_id=auth.uid()) with check (student_id=auth.uid());

create or replace function kb_private.normalize_options(input jsonb) returns jsonb
language plpgsql immutable set search_path='' as $$
begin
  if jsonb_typeof(input)='string' then
    begin
      input := (input #>> '{}')::jsonb;
    exception when invalid_text_representation then
      return coalesce((select jsonb_agg(trim(line) order by n)
        from regexp_split_to_table(input #>> '{}',E'\\r?\\n') with ordinality as lines(line,n)
        where trim(line)<>''),'[]');
    end;
  end if;
  if jsonb_typeof(input)='object' then
    return coalesce((select jsonb_agg(value order by length(key),key) from jsonb_each_text(input)),'[]');
  end if;
  if jsonb_typeof(input)='array' then
    return coalesce((select jsonb_agg(coalesce(value,'') order by n) from jsonb_array_elements_text(input) with ordinality as opts(value,n)),'[]');
  end if;
  return '[]';
end $$;

create or replace function kb_private.answer_index(opts jsonb, answer text) returns integer
language plpgsql immutable set search_path='' as $$
declare idx integer;
begin
  answer := trim(coalesce(answer,''));
  if answer='' then return null; end if;
  select (n-1)::integer into idx from jsonb_array_elements_text(opts) with ordinality as o(value,n)
    where lower(trim(value))=lower(answer) order by n limit 1;
  if idx is not null then return idx; end if;
  if answer ~ '^[A-Za-z]$' then idx:=ascii(upper(answer))-65;
  elsif answer ~ '^[0-9]{1,8}$' then idx:=answer::integer;
  end if;
  if idx between 0 and jsonb_array_length(opts)-1 then return idx; end if;
  return null;
end $$;

create or replace function public.kb_begin_quiz(p_quiz text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); attempt kb_private.quiz_attempts; snapshot jsonb; visible jsonb;
begin
  if uid is null then raise exception 'Masuk untuk mengerjakan kuis'; end if;
  if not exists(select 1 from public.quizzes q join public.subjects s on s.id=q.subject_id
    where q.id::text=p_quiz and not q.kb_archived and not s.kb_archived) then
    raise exception 'Kuis tidak tersedia';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text||':quiz:'||p_quiz,0));
  select * into attempt from kb_private.quiz_attempts a where a.student_id=uid and a.quiz_id=p_quiz
    and a.score is null and a.expires_at>now() order by a.expires_at desc limit 1;
  if attempt.id is null then
    select jsonb_agg(jsonb_build_object('id',id,'text',question_text,'options',opts,'key',answer) order by id)
      into snapshot
      from (select q.kb_id id,q.question_text,o.opts,case when q.kb_correct_index between 0 and jsonb_array_length(o.opts)-1 then q.kb_correct_index
        else kb_private.answer_index(o.opts,q.correct_answer::text) end answer
        from public.questions q cross join lateral (select kb_private.normalize_options(to_jsonb(q.options)) opts) o
        where q.quiz_id::text=p_quiz) prepared_questions;
    if snapshot is null then raise exception 'Kuis belum memiliki soal'; end if;
    if exists(select 1 from jsonb_array_elements(snapshot) i where jsonb_array_length(i->'options')<2 or i->'key'='null'::jsonb) then
      raise exception 'Ada soal yang perlu diperbaiki oleh admin';
    end if;
    insert into kb_private.quiz_attempts(student_id,quiz_id,items) values(uid,p_quiz,snapshot) returning * into attempt;
  end if;
  select jsonb_agg(item-'key' order by n) into visible from jsonb_array_elements(attempt.items) with ordinality as v(item,n);
  return jsonb_build_object('id',attempt.id,'questions',visible);
end $$;

create or replace function public.kb_submit_quiz(p_attempt uuid,p_answers jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); attempt kb_private.quiz_attempts; quiz public.quizzes; total integer; correct integer;
begin
  select * into attempt from kb_private.quiz_attempts where id=p_attempt and student_id=uid for update;
  if not found then raise exception 'Percobaan kuis tidak ditemukan'; end if;
  total:=jsonb_array_length(attempt.items);
  if attempt.score is null then
    if attempt.expires_at<=now() then raise exception 'Percobaan sudah kedaluwarsa. Buka kuis lagi.'; end if;
    if jsonb_typeof(p_answers) is distinct from 'object' or octet_length(p_answers::text)>1048576 then
      raise exception 'Format jawaban tidak valid';
    end if;
    if exists (
      select 1 from jsonb_each(p_answers) a where not exists(
        select 1 from jsonb_array_elements(attempt.items) i where i->>'id'=a.key and jsonb_typeof(a.value)='number'
        and a.value::text ~ '^[0-9]{1,8}$'
        and (a.value::text)::numeric < jsonb_array_length(i->'options')
      )
    ) then raise exception 'Pilihan jawaban tidak valid'; end if;
    select count(*) into correct from jsonb_array_elements(attempt.items) i where p_answers->(i->>'id')=i->'key';
    select q.* into quiz from public.quizzes q join public.subjects s on s.id=q.subject_id
      where q.id::text=attempt.quiz_id and not q.kb_archived and not s.kb_archived;
    if not found then raise exception 'Kuis sudah tidak tersedia'; end if;
    attempt.score:=round(100.0*correct/total);
    attempt.correct_count:=correct;
    attempt.finished_at:=now();
    insert into public.quiz_results(student_id,quiz_id,score,completed_at) values(uid,quiz.id,attempt.score,attempt.finished_at);
    update kb_private.quiz_attempts set score=attempt.score,correct_count=correct,finished_at=attempt.finished_at where id=p_attempt;
  end if;
  return jsonb_build_object('score',attempt.score,'correct',attempt.correct_count,'total',total,'completed_at',attempt.finished_at);
end $$;

create or replace function public.kb_material_action(p_material text,p_action text,p_value boolean default true) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); material public.materials;
begin
  if uid is null or p_action is null or p_action not in ('open','bookmark','complete') or p_value is null then
    raise exception 'Tindakan tidak valid';
  end if;
  select m.* into material from public.materials m join public.subjects s on s.id=m.subject_id
    where m.id::text=p_material and not m.kb_archived and not s.kb_archived;
  if not found then raise exception 'Materi tidak tersedia'; end if;
  if p_action='complete' then
    perform pg_advisory_xact_lock(hashtextextended(uid::text||':material:'||p_material,0));
    update public.progress set completed=p_value,updated_at=now() where student_id=uid and material_id=material.id;
    if not found then
      insert into public.progress(student_id,material_id,completed,updated_at) values(uid,material.id,p_value,now());
    end if;
  elsif p_action='open' then
    insert into public.kb_material_activity(student_id,material_id,opened_at) values(uid,p_material,now())
    on conflict(student_id,material_id) do update set opened_at=now();
  else
    insert into public.kb_material_activity(student_id,material_id,bookmarked_at) values(uid,p_material,case when p_value then now() end)
    on conflict(student_id,material_id) do update set bookmarked_at=excluded.bookmarked_at;
  end if;
end $$;

create or replace function public.kb_set_name(p_name text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or p_name is null or length(trim(p_name)) not between 1 and 80 then raise exception 'Nama tidak valid'; end if;
  update public.profiles set full_name=trim(p_name) where id=auth.uid();
end $$;

create or replace function public.kb_popular_subjects() returns jsonb
language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'learners',learners) order by learners desc,id),'[]')
  from (
    select s.id,count(distinct p.student_id) learners
    from public.progress p join public.materials m on m.id=p.material_id join public.subjects s on s.id=m.subject_id
    where auth.uid() is not null and p.completed and not s.kb_archived and not m.kb_archived
    group by s.id having count(distinct p.student_id)>=3 order by learners desc,s.id limit 6
  ) subjects
$$;

create or replace function public.kb_usage() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not public.kb_is_admin() then raise exception 'Akses khusus admin'; end if;
  return jsonb_build_object('students',(select count(*) from public.profiles where role='student'),
    'completions',(select count(distinct (student_id,material_id)) from public.progress where completed),
    'attempts',(select count(*) from public.quiz_results));
end $$;


create or replace function public.kb_admin_save_question(
  p_id uuid,p_quiz text,p_text text,p_options jsonb,p_answer text,p_index integer
) returns uuid
language plpgsql security invoker set search_path='' as $$
declare existing public.questions; quiz public.quizzes; out_id uuid; stored_key jsonb;
begin
  if not public.kb_is_admin() then raise exception 'Akses khusus admin'; end if;
  select * into quiz from public.quizzes where id::text=p_quiz;
  if not found then raise exception 'Kuis tidak ditemukan'; end if;
  if jsonb_typeof(p_options) is distinct from 'array' or nullif(trim(p_text),'') is null then
    raise exception 'Data soal tidak valid';
  end if;
  if jsonb_array_length(p_options) not between 2 and 26 or p_index is null
    or p_index not between 0 and jsonb_array_length(p_options)-1
    or p_options->>p_index is distinct from p_answer then
    raise exception 'Pilihan jawaban tidak valid';
  end if;
  stored_key:=case when pg_typeof(existing.correct_answer)::text in ('smallint','integer','bigint','numeric','real','double precision')
    then to_jsonb(p_index) else to_jsonb(p_answer) end;
  existing:=jsonb_populate_record(null::public.questions,jsonb_build_object('options',p_options,'correct_answer',stored_key));
  if p_id is null then
    insert into public.questions(quiz_id,question_text,options,correct_answer,kb_correct_index)
      values(quiz.id,trim(p_text),existing.options,existing.correct_answer,p_index) returning kb_id into out_id;
  else
    update public.questions set question_text=trim(p_text),options=existing.options,
      correct_answer=existing.correct_answer,kb_correct_index=p_index
      where quiz_id=quiz.id and kb_id=p_id returning kb_id into out_id;
  end if;
  if out_id is null then raise exception 'Soal tidak ditemukan'; end if;
  return out_id;
end $$;

create or replace function public.kb_admin_save_announcement(p_id text,p_title text,p_message text) returns void
language plpgsql security invoker set search_path='' as $$
declare col text; cols text:='title,kb_message'; vals text:='$1,$2'; edits text:='title=$1,kb_message=$2'; affected integer;
begin
  if not public.kb_is_admin() then raise exception 'Akses khusus admin'; end if;
  if nullif(trim(p_title),'') is null or nullif(trim(p_message),'') is null then
    raise exception 'Isi judul dan pengumuman';
  end if;
  for col in select column_name::text from information_schema.columns where table_schema='public'
    and table_name='announcements' and column_name in ('content','message','body','description')
    and data_type in ('text','character varying','character') and is_generated='NEVER'
  loop
    cols:=cols||format(',%I',col);
    vals:=vals||',$2';
    edits:=edits||format(',%I=$2',col);
  end loop;
  if p_id is null then
    execute format('insert into public.announcements(%s) values(%s)',cols,vals) using trim(p_title),trim(p_message);
  else
    execute format('update public.announcements set %s where id::text=$3',edits) using trim(p_title),trim(p_message),p_id;
    get diagnostics affected=row_count;
    if affected=0 then raise exception 'Pengumuman tidak ditemukan'; end if;
  end if;
end $$;

revoke all on function public.kb_admin_save_question(uuid,text,text,jsonb,text,integer),public.kb_admin_save_announcement(text,text,text) from public,anon;
grant execute on function public.kb_admin_save_question(uuid,text,text,jsonb,text,integer),public.kb_admin_save_announcement(text,text,text) to authenticated;

revoke all on function public.kb_begin_quiz(text),public.kb_submit_quiz(uuid,jsonb),
  public.kb_material_action(text,text,boolean),public.kb_set_name(text),public.kb_popular_subjects(),public.kb_usage() from public,anon;
grant execute on function public.kb_begin_quiz(text),public.kb_submit_quiz(uuid,jsonb),
  public.kb_material_action(text,text,boolean),public.kb_set_name(text),public.kb_popular_subjects(),public.kb_usage() to authenticated;

-- Bucket baru untuk file privat. Pengaturan dan isi bucket media lama dipertahankan.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('kb-learning','kb-learning',false,52428800,array['application/pdf','image/png','image/jpeg','image/webp','video/mp4','video/webm','audio/mpeg','text/plain'])
on conflict(id) do nothing;
drop policy if exists kb_learning_read on storage.objects;
drop policy if exists kb_learning_admin on storage.objects;
drop policy if exists kb_learning_insert_guard on storage.objects;
drop policy if exists kb_learning_update_guard on storage.objects;
drop policy if exists kb_learning_delete_guard on storage.objects;
drop policy if exists kb_learning_read_guard on storage.objects;
create policy kb_learning_read on storage.objects for select to authenticated using (
  bucket_id='kb-learning' and exists(select 1 from public.attachments a where a.path=objects.name and a.kb_bucket='kb-learning')
);
create policy kb_learning_admin on storage.objects for all to authenticated using (bucket_id='kb-learning' and public.kb_is_admin())
  with check (bucket_id='kb-learning' and public.kb_is_admin());
create policy kb_learning_read_guard on storage.objects as restrictive for select to public using (
  case when bucket_id='kb-learning' then auth.uid() is not null and (public.kb_is_admin() or exists(
    select 1 from public.attachments a where a.path=objects.name and a.kb_bucket='kb-learning'
  )) else true end
);
create policy kb_learning_insert_guard on storage.objects as restrictive for insert to public with check (
  case when bucket_id in ('kb-learning','media') then auth.uid() is not null and public.kb_is_admin() else true end
);
create policy kb_learning_update_guard on storage.objects as restrictive for update to public using (
  case when bucket_id in ('kb-learning','media') then auth.uid() is not null and public.kb_is_admin() else true end
) with check (
  case when bucket_id in ('kb-learning','media') then auth.uid() is not null and public.kb_is_admin() else true end
);
create policy kb_learning_delete_guard on storage.objects as restrictive for delete to public using (
  case when bucket_id in ('kb-learning','media') then auth.uid() is not null and public.kb_is_admin() else true end
);

notify pgrst, 'reload schema';
commit;
