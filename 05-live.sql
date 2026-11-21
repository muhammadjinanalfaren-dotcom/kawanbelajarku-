begin;
-- Requires the existing remake schema. Installation once, transactional.
create table kb_private.live_bank(id uuid primary key default gen_random_uuid(), owner_id uuid not null, title text not null, items jsonb not null);
create table kb_private.live_room(
 code text primary key, host uuid not null, title text not null, items jsonb not null,
 status text not null default 'waiting', config jsonb not null, locked boolean not null default false,
 pos int not null default 0, created timestamptz not null default now(), expires timestamptz not null default now()+interval '1 day',
 started timestamptz, tick timestamptz, paused timestamptz, ended timestamptz);
create index on kb_private.live_room(host,created desc);
create table kb_private.live_member(code text references kb_private.live_room, uid uuid, name text not null, avatar int not null, ready boolean not null default false, kicked boolean not null default false,
 pos int not null default 0, tick timestamptz, done timestamptz, primary key(code,uid));
create table kb_private.live_answer(code text,uid uuid,pos int, answer jsonb not null, correct boolean not null,points int not null, seconds numeric not null,
 primary key(code,uid,pos), foreign key(code,uid) references kb_private.live_member);
create table kb_private.live_gate(uid uuid primary key, since timestamptz not null, tries int not null);
create table public.kb_live_signal(code text primary key references kb_private.live_room, version bigint not null default 0);
alter table public.kb_live_signal enable row level security;
revoke all on public.kb_live_signal from public,anon,authenticated;
grant select on public.kb_live_signal to authenticated;
create function public.kb_live_visible(room_code text) returns boolean language sql stable security definer set search_path='' as $$
select exists(select from kb_private.live_room where code=room_code and host=auth.uid()) or exists(select from kb_private.live_member where code=room_code and uid=auth.uid() and not kicked) $$;
create policy live_signal_member on public.kb_live_signal for select to authenticated using(public.kb_live_visible(code));
alter publication supabase_realtime add table public.kb_live_signal;

create table kb_private.teacher_grant(uid uuid primary key references auth.users);
create table kb_private.classroom(id uuid primary key default gen_random_uuid(), owner_id uuid not null, title text not null, invite uuid unique not null default gen_random_uuid());
create table kb_private.enrollment(class_id uuid references kb_private.classroom, student uuid,primary key(class_id,student));
create table kb_private.homework(id uuid primary key default gen_random_uuid(),class_id uuid references kb_private.classroom, title text not null,items jsonb not null,due timestamptz not null,retry boolean not null);
create table kb_private.homework_run(task uuid references kb_private.homework, student uuid,code text primary key references kb_private.live_room);
create index on kb_private.homework_run(task,student);

create function kb_private.is_teacher() returns boolean language sql stable set search_path='' as $$
select (exists(select from public.profiles where id=auth.uid() and role::text in ('teacher','guru','admin')) or exists(select from kb_private.teacher_grant where uid=auth.uid())) and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false) $$;

-- Each call validates ownership. Student clients never select snapshots or keys.
create function public.kb_live_bank(action text, payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); b kb_private.live_bank; q jsonb; opts jsonb; k jsonb; typ text; n int; i jsonb;
begin
 if uid is null or not kb_private.is_teacher() then raise exception 'Akses guru diperlukan'; end if;
 if action='list' then return coalesce((select jsonb_agg(to_jsonb(t)) from (select id,title from kb_private.live_bank where owner_id=uid or public.kb_is_admin() order by title)t),'[]'); end if;
 if payload->>'id' is not null then select * into strict b from kb_private.live_bank where id=(payload->>'id')::uuid and (owner_id=uid or public.kb_is_admin()) for update; end if;
 if action='get' and b.id is not null then return to_jsonb(b); end if;
 if action<>'save' or length(trim(coalesce(payload->>'title',''))) not between 1 and 120 or jsonb_typeof(payload->'items') is distinct from 'array' or jsonb_array_length(payload->'items') not between 1 and 100 or pg_column_size(payload)>600000 then raise exception 'Periksa judul dan isi kuis'; end if;
 for q in select value from jsonb_array_elements(payload->'items') loop
  typ:=q->>'type'; opts:=q->'options'; k:=q->'key';
  if typ is null or typ not in ('single','multi','short','order','match','boolean') or length(trim(coalesce(q->>'text',''))) not between 1 and 2000 or coalesce((q->>'weight')::int,0) not between 1 and 100 then raise exception 'Soal atau bobot belum lengkap'; end if;
  if coalesce(q->>'image','')<>'' and q->>'image' !~ '^https://' then raise exception 'Gunakan URL gambar HTTPS'; end if;
  if typ='short' then
    if jsonb_typeof(k) is distinct from 'string' or length(trim(q->>'key'))=0 then raise exception 'Isi jawaban pendek'; end if;
  else
    if jsonb_typeof(opts) is distinct from 'array' then raise exception 'Isi pilihan'; end if;
    n:=jsonb_array_length(opts);
    if n not between 2 and 12 or exists(select from jsonb_array_elements(opts) x where jsonb_typeof(x)<>'string' or length(trim(x#>>'{}'))=0) or (select count(distinct x) from jsonb_array_elements(opts)x)<>n then raise exception 'Pilihan harus berbeda dan terisi'; end if;
    if typ in ('single','boolean') then
     if not opts @> jsonb_build_array(k) or (typ='boolean' and n<>2) then raise exception 'Kunci pilihan tidak valid'; end if;
    else
     if jsonb_typeof(k) is distinct from 'array' or jsonb_array_length(k)<1 or not opts @> k or (select count(distinct x) from jsonb_array_elements(k)x)<>jsonb_array_length(k) then raise exception 'Periksa daftar kunci'; end if;
     if typ in ('match','order') and jsonb_array_length(k)<>n then raise exception 'Kunci harus mencakup semua pilihan'; end if;
     if typ='match' and (jsonb_typeof(q->'prompts') is distinct from 'array' or jsonb_array_length(q->'prompts')<>n or exists(select from jsonb_array_elements(q->'prompts') x where jsonb_typeof(x)<>'string' or length(trim(x#>>'{}'))=0)) then raise exception 'Jumlah pasangan berbeda'; end if;
    end if;
  end if;
 end loop;
 if b.id is null then insert into kb_private.live_bank(owner_id,title,items) values(uid,trim(payload->>'title'),payload->'items') returning * into b;
 else update kb_private.live_bank set title=trim(payload->>'title'),items=payload->'items' where id=b.id; end if;
 return to_jsonb(b.id);
end $$;

create function public.kb_live_create(source text, settings jsonb) returns text language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); items jsonb; room_code text; q jsonb; fixed jsonb:='[]'; n int;
begin
 if uid is null or not kb_private.is_teacher() then raise exception 'Hanya guru dapat membuat sesi'; end if;
 if length(trim(coalesce(settings->>'title',''))) not between 1 and 100 or coalesce(settings->>'mode','') not in ('host','self') or coalesce((settings->>'seconds')::int,-1) not between 0 and 600 or coalesce((settings->>'capacity')::int,0) not between 1 and 200 then raise exception 'Pengaturan sesi tidak valid'; end if;
 if settings ? 'task' then raise exception 'Pengaturan sesi tidak valid'; end if;
 if left(source,4)='new:' then select b.items into items from kb_private.live_bank b where b.id=substr(source,5)::uuid and (b.owner_id=uid or public.kb_is_admin());
 else
 select jsonb_agg(jsonb_build_object('type','single','text',question_text,'options',o,'key',o->idx,'weight',1) order by id) into items from
 (select q.kb_id id,q.question_text,z.o,case when q.kb_correct_index between 0 and jsonb_array_length(z.o)-1 then q.kb_correct_index else kb_private.answer_index(z.o,q.correct_answer::text) end idx from public.questions q join public.quizzes k on k.id=q.quiz_id join public.subjects s on s.id=k.subject_id cross join lateral(select kb_private.normalize_options(to_jsonb(q.options)) o)z where k.id::text=source and not k.kb_archived and not s.kb_archived)t;
 end if;
 if items is null or jsonb_array_length(items) not between 1 and 100 then raise exception 'Pilih kuis berisi 1–100 soal'; end if;
 for q in select value from jsonb_array_elements(items) with ordinality t(value,ord) order by case when (settings->>'shuffleQuestions')::boolean then random() else ord::float end loop
 if (q->>'type'<>'short' and jsonb_array_length(q->'options')<2) or q->'key' is null or q->'key'='null' then raise exception 'Kunci soal belum lengkap'; end if;
 if ((settings->>'shuffleOptions')::boolean or q->>'type' in ('order','match')) and q->>'type'<>'short' then q:=jsonb_set(q,'{options}',(select jsonb_agg(x order by random()) from jsonb_array_elements(q->'options') x)); end if;
 fixed:=fixed||jsonb_build_array(q);
 end loop;
 loop
 room_code:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
 insert into kb_private.live_room(code,host,title,items,config) values(room_code,uid,trim(settings->>'title'),fixed,settings) on conflict do nothing;
 exit when found;
 end loop;
 insert into public.kb_live_signal(code) values(room_code);
 return room_code;
end $$;

create function public.kb_live_action(room_code text, action text, payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); r kb_private.live_room; m kb_private.live_member; host_ok boolean; p int; total int; secs int; elapsed numeric; t timestamptz; q jsonb; a jsonb; right_answer boolean; points int; tries int;
begin
 if me is null then raise exception 'Masuk dahulu'; end if;
 if action in ('check','join','answer') then
 insert into kb_private.live_gate as g values(me,clock_timestamp(),1) on conflict(uid) do update set since=case when g.since<now()-interval '1 minute' then now() else g.since end,tries=case when g.since<now()-interval '1 minute' then 1 else g.tries+1 end returning g.tries into tries;
 if tries>100 then return jsonb_build_object('error','Terlalu banyak percobaan. Tunggu satu menit.'); end if;
 end if;
 select * into r from kb_private.live_room where code=room_code for update;
 if not found then return jsonb_build_object('error','Kode ruang tidak ditemukan'); end if;
 t:=clock_timestamp(); host_ok:=r.host=me; total:=jsonb_array_length(r.items); secs:=(r.config->>'seconds')::int;
 select * into m from kb_private.live_member where code=r.code and uid=me;
 if action in ('check','join') then
 if m.kicked then return jsonb_build_object('error','Akses peserta telah dicabut'); end if;
 if m.uid is not null or host_ok then return '{"joined":true}'; end if;
 if r.status<>'waiting' or r.locked or r.expires<=t then return jsonb_build_object('error','Ruang sudah ditutup'); end if;
 if coalesce((auth.jwt()->>'is_anonymous')::boolean,false) and not coalesce((r.config->>'guest')::boolean,false) then return jsonb_build_object('error','Guru mewajibkan akun siswa. Masuk dengan akun sekolah.'); end if;
 if action='check' then return jsonb_build_object('title',r.title); end if;
 if length(trim(coalesce(payload->>'name',''))) not between 1 and 32 or coalesce((payload->>'avatar')::int,-1) not between 0 and 15 then raise exception 'Periksa nama dan avatar'; end if;
 if (select count(*) from kb_private.live_member where code=r.code and not kicked)>=(r.config->>'capacity')::int then return jsonb_build_object('error','Ruang penuh'); end if;
 insert into kb_private.live_member(code,uid,name,avatar) values(r.code,me,trim(payload->>'name'),(payload->>'avatar')::int);
 elsif action='ready' and m.uid is not null and not m.kicked and r.status='waiting' and coalesce((r.config->>'ready')::boolean,false) then
 update kb_private.live_member set ready=coalesce((payload->>'ready')::boolean,false) where code=r.code and uid=me;
 elsif action='answer' then
 if r.config ? 'task' and (r.expires<=t or not exists(select from kb_private.homework h join kb_private.enrollment e on e.class_id=h.class_id where h.id=(r.config->>'task')::uuid and e.student=me)) then raise exception 'Tenggat lewat atau keanggotaan kelas berakhir'; end if;
 if m.uid is null or m.kicked then raise exception 'Bukan peserta'; end if;
 p:=case when r.config->>'mode'='host' then r.pos else m.pos end;
 if exists(select from kb_private.live_answer where code=r.code and uid=me and pos=(payload->>'pos')::int) then return '{"saved":true}'; end if;
 if r.status<>'active' or p is distinct from (payload->>'pos')::int or p>=total then raise exception 'Soal sudah berpindah atau sesi dijeda'; end if;
 elapsed:=greatest(0,extract(epoch from t-case when r.config->>'mode'='host' then r.tick else m.tick end));
 q:=r.items->p; a:=payload->'answer';
 if secs>0 and elapsed>=secs then a:='null'; end if;
 if a is null or a='null' then
   if secs=0 or elapsed<secs then raise exception 'Isi jawaban terlebih dahulu'; end if;
 elsif pg_column_size(a)>8192 then raise exception 'Jawaban terlalu panjang';
 elsif q->>'type' in ('multi','order','match') then
   if jsonb_typeof(a)<>'array' then raise exception 'Format jawaban tidak sesuai'; end if;
   if jsonb_array_length(a)<1 or not (q->'options' @> a) or jsonb_array_length(a)<>(select count(distinct x) from jsonb_array_elements(a)x) or (q->>'type'<>'multi' and jsonb_array_length(a)<>jsonb_array_length(q->'options')) then raise exception 'Periksa pilihan jawaban'; end if;
 elsif jsonb_typeof(a)<>'string' or length(trim(a#>>'{}'))=0 or (q->>'type'<>'short' and not (q->'options' @> jsonb_build_array(a))) then raise exception 'Jawaban tidak valid';
 end if;
 right_answer:=case when q->>'type'='multi' then a @> (q->'key') and (q->'key') @> a and jsonb_typeof(a)='array'
 when q->>'type'='short' then lower(trim(a#>>'{}'))=lower(trim(q->>'key')) else a=q->'key' end;
 right_answer:=coalesce(right_answer,false);
 points:=case when right_answer then (q->>'weight')::int*(100+case when r.config->>'score'='speed' and secs>0 then floor(50*greatest(0,1-elapsed/secs))::int else 0 end) else 0 end;
 insert into kb_private.live_answer values(r.code,me,p,coalesce(a,'null'),right_answer,points,elapsed);
 if r.config->>'mode'='self' then update kb_private.live_member set pos=p+1,tick=t,done=case when p+1=total then t end where code=r.code and uid=me; end if;
 if r.config->>'mode'='host' and p+1=total then update kb_private.live_member set done=t where code=r.code and uid=me; end if;
 if r.config ? 'task' and p+1=total then update kb_private.live_room set status='finished',ended=t where code=r.code; end if;
 elsif host_ok then
 case
 when action in ('lock','unlock') and r.status='waiting' then update kb_private.live_room set locked=(action='lock') where code=r.code;
 when action='kick' and r.status='waiting' then update kb_private.live_member set kicked=true where code=r.code and uid=(payload->>'uid')::uuid;
 when action='start' and r.status='waiting' and r.expires>t then
 if not exists(select from kb_private.live_member where code=r.code and not kicked) then raise exception 'Tunggu minimal satu peserta'; end if;
 update kb_private.live_room set status='active',started=t,tick=t where code=r.code;
 update kb_private.live_member set tick=t where code=r.code;
 when action='pause' and r.status='active' then update kb_private.live_room set status='paused',paused=t where code=r.code;
 when action='resume' and r.status='paused' then update kb_private.live_room set status='active',tick=tick+(t-paused),paused=null where code=r.code;
 update kb_private.live_member set tick=tick+(t-r.paused) where code=r.code and done is null;
 when action='next' and r.status='active' and r.config->>'mode'='host' and r.pos=(payload->>'pos')::int and r.pos+1<total then update kb_private.live_room set pos=pos+1,tick=t where code=r.code;
 when action='finish' and r.status in ('active','paused') then update kb_private.live_room set status='finished',ended=t where code=r.code;
 when action='cancel' and r.status='waiting' then update kb_private.live_room set status='cancelled',ended=t where code=r.code;
 else raise exception 'Tindakan tidak tersedia pada status ini'; end case;
 else raise exception 'Akses host diperlukan'; end if;
 update public.kb_live_signal set version=version+1 where code=r.code;
 if action='answer' and r.config->>'reveal'='each' then return jsonb_build_object('feedback',case when right_answer then 'Benar' else 'Salah' end,'key',q->'key'); end if;
 return '{"ok":true}';
end $$;
create function public.kb_live_history() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(t)),'[]') from (select r.code,r.title,r.status,r.created from kb_private.live_room r where r.host=auth.uid() or public.kb_is_admin() or exists(select from kb_private.live_member m where m.code=r.code and m.uid=auth.uid() and not kicked) order by created desc limit 200)t $$;

create function public.kb_live_state(room_code text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r kb_private.live_room; m kb_private.live_member; staff boolean; p int; tally jsonb; board jsonb; members jsonb; ans kb_private.live_answer; q jsonb; review jsonb;
begin
 select * into r from kb_private.live_room k where k.code=room_code and (k.host=auth.uid() or (public.kb_is_admin() and k.status='finished') or exists(select from kb_private.live_member x where x.code=k.code and x.uid=auth.uid() and not x.kicked));
 if not found then raise exception 'Akses ruang ditolak'; end if;
 staff:=r.host=auth.uid() or (public.kb_is_admin() and r.status='finished');
 select * into m from kb_private.live_member where code=r.code and uid=auth.uid() and not kicked;
 if not staff and m.uid is null then raise exception 'Akses ruang ditolak'; end if;
 p:=case when r.config->>'mode'='host' or staff then r.pos else m.pos end;
 select * into ans from kb_private.live_answer where code=r.code and uid=m.uid and pos=p;
 select coalesce(jsonb_agg(jsonb_build_object('name',x.name,'avatar',x.avatar,'uid',case when staff then x.uid end,'ready',x.ready,'done',x.done is not null,'submitted',(select count(*) from kb_private.live_answer a where a.code=r.code and a.uid=x.uid)) order by x.name,x.uid),'[]') into members from kb_private.live_member x where x.code=r.code and not x.kicked;
 if r.status='finished' then
 with totals as (select x.uid,x.name,x.avatar,coalesce(sum(a.points),0) score,count(*) filter(where a.correct) correct,count(*) filter(where not a.correct and a.answer<>'null') wrong,coalesce(sum(a.seconds) filter(where a.answer<>'null'),0) seconds,round(extract(epoch from coalesce(x.done,r.ended)-r.started)) duration
 from kb_private.live_member x left join kb_private.live_answer a on a.code=x.code and a.uid=x.uid where x.code=r.code and not x.kicked group by x.uid,x.name,x.avatar,x.done),
 ranked as (select *,rank() over(order by score desc,correct desc) ranking from totals)
 select (select to_jsonb(x)-'uid' from ranked x where x.uid=m.uid),coalesce((select jsonb_agg(jsonb_build_object('avatar',avatar,'name',name,'score',score,'ranking',ranking) order by ranking,name) from ranked x),'[]') into tally,board;
 if m.uid is not null then select jsonb_agg(jsonb_build_object('text',i->>'text','key',i->'key','answer',a.answer,'correct',a.correct,'explanation',i->>'explanation') order by ord) into review from jsonb_array_elements(r.items) with ordinality t(i,ord) left join kb_private.live_answer a on a.code=r.code and a.uid=m.uid and a.pos=ord-1; end if;
 end if;
 if r.status in ('active','paused') and coalesce((r.config->>'board')::boolean,false) and (r.config->>'reveal'='each' or staff) then
   select coalesce(jsonb_agg(jsonb_build_object('name',v.name,'avatar',v.avatar,'score',v.score,'ranking',v.rank) order by v.rank,v.name),'[]') into board
   from (select z.*,rank() over(order by score desc,correct desc) rank from
    (select x.uid,x.name,x.avatar,coalesce(sum(a.points),0) score,count(*) filter(where a.correct) correct from kb_private.live_member x left join kb_private.live_answer a on a.code=x.code and a.uid=x.uid where x.code=r.code and not x.kicked group by x.uid,x.name,x.avatar)z)v;
 end if;
 if not coalesce((r.config->>'board')::boolean,false) then tally:=tally-'ranking'; end if;
 if r.status='active' then q:=r.items->p; end if;
 return jsonb_build_object('code',r.code,'title',r.title,'status',r.status,'host',r.host=auth.uid(),'report',staff,'config',r.config,'locked',r.locked,'pos',p,'total',jsonb_array_length(r.items),'members',members,'avatar',m.avatar,'name',m.name,'ready',m.ready,'accepted',ans.uid is not null,'feedback',case when ans.uid is not null and r.config->>'reveal'='each' then jsonb_build_object('correct',ans.correct,'key',q->'key') end,'question',q-'key'-'explanation','server',clock_timestamp(),'tick',case when r.config->>'mode'='host' then r.tick else m.tick end,'result',tally,'review',review,'board',case when staff or (r.config->>'board')::boolean then board end);
end $$;
create function public.kb_live_report(room_code text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r kb_private.live_room;
begin
 select * into strict r from kb_private.live_room where code=room_code and (host=auth.uid() or public.kb_is_admin()) and status='finished';
 return jsonb_build_object('title',r.title,'code',r.code,'date',r.started,'items',r.items,'members',(select coalesce(jsonb_agg(jsonb_build_object('uid',uid,'name',name,'avatar',avatar)),'[]') from kb_private.live_member where code=r.code and not kicked),'answers',(select coalesce(jsonb_agg(to_jsonb(a)-'code'),'[]') from kb_private.live_answer a join kb_private.live_member m using(code,uid) where a.code=r.code and not m.kicked));
end $$;
revoke all on function public.kb_live_visible(text),public.kb_live_history(),public.kb_live_report(text),public.kb_live_state(text),public.kb_live_create(text,jsonb),public.kb_live_action(text,text,jsonb),public.kb_live_bank(text,jsonb) from public,anon,authenticated;
grant execute on function public.kb_live_visible(text),public.kb_live_history(),public.kb_live_report(text),public.kb_live_state(text),public.kb_live_create(text,jsonb),public.kb_live_action(text,text,jsonb),public.kb_live_bank(text,jsonb) to authenticated;
create function public.kb_live_role() returns text language sql stable security definer set search_path='' as $$
select case when public.kb_is_admin() then 'admin' when kb_private.is_teacher() then 'teacher' else 'student' end $$;
create function public.kb_live_teacher(target uuid, enabled boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.kb_is_admin() then raise exception 'Khusus admin'; end if;
 if not exists(select from auth.users where id=target and not coalesce(is_anonymous,false)) then raise exception 'Akun sekolah tidak ditemukan'; end if;
 if enabled then insert into kb_private.teacher_grant values(target) on conflict do nothing; else delete from kb_private.teacher_grant where uid=target; end if;
end $$;
create function public.kb_live_class(action text,payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); c kb_private.classroom; h kb_private.homework; b kb_private.live_bank; rr kb_private.live_room; t timestamptz:=clock_timestamp(); code_new text; name text; staff boolean;
begin
 if me is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Masuk dengan akun sekolah'; end if;
 if action='create' then
 if not kb_private.is_teacher() or length(trim(coalesce(payload->>'title',''))) not between 1 and 100 then raise exception 'Periksa izin dan nama kelas'; end if;
 insert into kb_private.classroom(owner_id,title) values(me,trim(payload->>'title')) returning * into c;return to_jsonb(c.id);
 elsif action='join' then
 select * into strict c from kb_private.classroom where invite=(payload->>'invite')::uuid;
 insert into kb_private.enrollment values(c.id,me) on conflict do nothing;return to_jsonb(c.id);
 elsif action='list' then return coalesce((select jsonb_agg(jsonb_build_object('id',k.id,'title',k.title) order by k.title) from kb_private.classroom k where k.owner_id=me or public.kb_is_admin() or exists(select from kb_private.enrollment e where e.class_id=k.id and e.student=me)),'[]');
 elsif action='notices' then return coalesce((select jsonb_agg(jsonb_build_object('id',h1.id,'class_id',h1.class_id,'title',h1.title,'due',h1.due) order by h1.due) from kb_private.homework h1 join kb_private.enrollment e on e.class_id=h1.class_id where e.student=me and h1.due>now() and not exists(select from kb_private.homework_run x join kb_private.live_room y on y.code=x.code where x.task=h1.id and x.student=me and y.status='finished')),'[]'); end if;
 select * into strict c from kb_private.classroom where id=(payload->>'class_id')::uuid;
 staff:=c.owner_id=me or public.kb_is_admin();
 if not staff and not exists(select from kb_private.enrollment where class_id=c.id and student=me) then raise exception 'Akses kelas ditolak'; end if;
 if action='view' then return jsonb_build_object('title',c.title,'staff',staff,'invite',case when staff then c.invite end,
 'members',case when staff then (select coalesce(jsonb_agg(jsonb_build_object('uid',e.student,'name',coalesce(p.full_name,'Siswa'))),'[]') from kb_private.enrollment e left join public.profiles p on p.id=e.student where e.class_id=c.id) end,
 'tasks',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'title',a.title,'due',a.due,'retry',a.retry,'runs',(select coalesce(jsonb_agg(jsonb_build_object('code',r.code,'status',r.status,'name',m.name) order by r.created desc),'[]') from kb_private.homework_run x join kb_private.live_room r on r.code=x.code join kb_private.live_member m on m.code=x.code and m.uid=x.student where x.task=a.id and (staff or x.student=me))) order by a.due),'[]') from kb_private.homework a where a.class_id=c.id));
 elsif action='remove' and staff then delete from kb_private.enrollment where class_id=c.id and student=(payload->>'uid')::uuid;
 elsif action='assign' and staff then
 select * into strict b from kb_private.live_bank where id=(payload->>'bank')::uuid and (owner_id=me or public.kb_is_admin());
 if (payload->>'due')::timestamptz<=t then raise exception 'Pilih tenggat yang akan datang'; end if;
 insert into kb_private.homework(class_id,title,items,due,retry) values(c.id,b.title,(select jsonb_agg(case when q->>'type' in ('match','order') then jsonb_set(q,'{options}',(select jsonb_agg(o order by random()) from jsonb_array_elements(q->'options')o)) else q end order by n) from jsonb_array_elements(b.items) with ordinality v(q,n)),(payload->>'due')::timestamptz,(payload->>'retry')::boolean);
 elsif action='attempt' then
 select * into strict h from kb_private.homework where id=(payload->>'task')::uuid and class_id=c.id for update;
 if not exists(select from kb_private.enrollment where class_id=c.id and student=me) then raise exception 'Khusus peserta kelas'; end if;
 select r.* into rr from kb_private.homework_run x join kb_private.live_room r on r.code=x.code where x.task=h.id and x.student=me order by r.created desc limit 1;
 if t>=h.due then raise exception 'Tenggat tugas telah lewat'; end if;
 if rr.code is not null and (rr.status='active' or not h.retry) then return to_jsonb(rr.code); end if;
 loop
 code_new:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
 insert into kb_private.live_room(code,host,title,items,status,config,started,tick,expires,locked) values(code_new,c.owner_id,h.title,h.items,'active',jsonb_build_object('task',h.id,'mode','self','seconds',0,'board',false,'score','accuracy','reveal','end'),t,t,h.due,true) on conflict do nothing;
 exit when found;
 end loop;
 select full_name into name from public.profiles where id=me;
 insert into kb_private.live_member(code,uid,name,avatar,tick) values(code_new,me,coalesce(name,'Siswa'),0,t);
 insert into kb_private.homework_run values(h.id,me,code_new);
 insert into public.kb_live_signal(code) values(code_new);return to_jsonb(code_new);
 else raise exception 'Tindakan kelas tidak tersedia'; end if;
 return '{"ok":true}';
end $$;
revoke all on function public.kb_live_teacher(uuid,boolean),public.kb_live_class(text,jsonb),public.kb_live_role() from public,anon;
grant execute on function public.kb_live_teacher(uuid,boolean),public.kb_live_class(text,jsonb),public.kb_live_role() to authenticated;

do $$
declare rel text;
begin
 foreach rel in array array['live_bank','live_room','live_member','live_answer','live_gate','teacher_grant','classroom','enrollment','homework','homework_run'] loop
 execute format('alter table kb_private.%I enable row level security',rel);
 execute format('revoke all on kb_private.%I from public,anon,authenticated',rel);
 end loop;
end $$;
commit;
