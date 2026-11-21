begin;
create or replace function public.kb_live_bank(action text, payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); b kb_private.live_bank; q jsonb; opts jsonb; k jsonb; typ text; n int; i jsonb;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Gunakan akun sekolah'; end if;
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
create or replace function public.kb_live_create(source text, settings jsonb) returns text language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); items jsonb; room_code text; q jsonb; fixed jsonb:='[]'; n int;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Gunakan akun sekolah'; end if;
 if length(trim(coalesce(settings->>'title',''))) not between 1 and 100 or coalesce(settings->>'mode','') not in ('host','self') or coalesce((settings->>'seconds')::int,-1) not between 0 and 600 or coalesce((settings->>'capacity')::int,0) not between 1 and 200 then raise exception 'Pengaturan sesi tidak valid'; end if;
 if source is null or (left(source,4)<>'new:' and not kb_private.is_teacher()) then raise exception 'Pilih kuis milikmu'; end if;
 settings:=jsonb_set(settings,'{reveal}','"end"');
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
 if (settings->>'play')::boolean then
 insert into kb_private.live_member(code,uid,name,avatar) values(room_code,uid,left(coalesce(nullif(trim(settings->>'player'),''),'Host'),32),0);
 end if;
 return room_code;
end $$;
-- Protect answers in rooms created before this migration as well.
update kb_private.live_room set config=jsonb_set(config,'{reveal}','"end"')
where status in ('waiting','active','paused') and config->>'reveal'='each';
create or replace function public.kb_live_state(room_code text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r kb_private.live_room; m kb_private.live_member; staff boolean; p int; tally jsonb; board jsonb; members jsonb; ans kb_private.live_answer; q jsonb; review jsonb;
begin
 select * into r from kb_private.live_room k where k.code=room_code and (k.host=auth.uid() or (public.kb_is_admin() and k.status='finished') or exists(select from kb_private.live_member x where x.code=k.code and x.uid=auth.uid() and not x.kicked));
 if not found then raise exception 'Akses ruang ditolak'; end if;
 staff:=r.host=auth.uid() or (public.kb_is_admin() and r.status='finished');
 select * into m from kb_private.live_member where code=r.code and uid=auth.uid() and not kicked;
 if not staff and m.uid is null then raise exception 'Akses ruang ditolak'; end if;
 p:=case when r.config->>'mode'='host' or (staff and m.uid is null) then r.pos else m.pos end;
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
 return jsonb_build_object('code',r.code,'title',r.title,'status',r.status,'host',r.host=auth.uid(),'report',staff,'config',r.config,'locked',r.locked,'pos',p,'total',jsonb_array_length(r.items),'members',members,'avatar',m.avatar,'name',m.name,'ready',m.ready,'accepted',ans.uid is not null,'feedback',null,'question',q-'key'-'explanation','server',clock_timestamp(),'tick',case when r.config->>'mode'='host' then r.tick else m.tick end,'result',tally,'review',review,'board',case when staff or (r.config->>'board')::boolean then board end);
end $$;
create function kb_private.study_today() returns date language sql stable set search_path='' as $$select (now() at time zone 'Asia/Jakarta')::date$$;
revoke all on function kb_private.study_today() from public,anon,authenticated;
create table kb_private.study_event(uid uuid not null,kind text not null,source text not null,day date not null,primary key(uid,kind,source));
create table kb_private.study_day(uid uuid not null,day date not null,status text not null,chain int not null,notified boolean not null default false,primary key(uid,day));
create function kb_private.record_study(who uuid,kind text,source text) returns void language plpgsql security definer set search_path='' as $$
declare today date:=kb_private.study_today(); prev date; n int; gap date; used int;
begin
 if who is null then return; end if;
 perform pg_advisory_xact_lock(hashtextextended(who::text,12));
 insert into kb_private.study_event values(who,kind,source,today) on conflict do nothing;
 if not found or exists(select from kb_private.study_day where uid=who and day=today) then return; end if;
 select day,chain into prev,n from kb_private.study_day where uid=who order by day desc limit 1;
 n:=coalesce(n,0);gap:=prev+1;
 while gap<today and n>0 loop
 select count(*) into used from kb_private.study_day where uid=who and status='Terlindungi' and day>=date_trunc('month',gap)::date and day<gap;
 if used>=3 then n:=0;else insert into kb_private.study_day values(who,gap,'Terlindungi',n,true);end if;
 gap:=gap+1;
 end loop;
 insert into kb_private.study_day values(who,today,'Belajar',n+1,false);
end $$;
create function kb_private.study_trigger() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='progress' then
 if new.completed then perform kb_private.record_study(new.student_id,'materi',new.material_id::text);end if;
 elsif tg_table_name='quiz_attempts' then
 if new.finished_at is not null then perform kb_private.record_study(new.student_id,'kuis',new.id::text);end if;
 elsif new.done is not null and not exists(select from auth.users where id=new.uid and is_anonymous) then
 perform kb_private.record_study(new.uid,'live',new.code);
 end if;
 return new;
end $$;
create trigger kb_material_streak after insert or update of completed on public.progress for each row execute function kb_private.study_trigger();
create trigger kb_quiz_streak after update of finished_at on kb_private.quiz_attempts for each row execute function kb_private.study_trigger();
create trigger kb_live_streak after update of done on kb_private.live_member for each row execute function kb_private.study_trigger();
create function public.kb_study_status(claim boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); today date:=kb_private.study_today(); firstday date; lastday date; gap date; n int; remaining int; days jsonb; notice boolean:=false;
begin
 if me is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Gunakan akun sekolah';end if;
 perform pg_advisory_xact_lock(hashtextextended(me::text,12));
 select min(day),max(day) into firstday,lastday from kb_private.study_day where uid=me;
 select chain into n from kb_private.study_day where uid=me and day=lastday;
 gap:=lastday+1;
 while gap<today and n>0 loop
 if (select count(*) from kb_private.study_day where uid=me and day>=date_trunc('month',gap)::date and day<gap and status='Terlindungi')>=3 then n:=0;
 else insert into kb_private.study_day values(me,gap,'Terlindungi',n,true);end if;
 gap:=gap+1;
 end loop;
 select 3-count(*) into remaining from kb_private.study_day where uid=me and status='Terlindungi' and day>=date_trunc('month',today)::date;
 select jsonb_agg(jsonb_build_object('day',d::date,'status',coalesce(s.status,case when d::date=today then 'Hari ini' when d::date>=firstday then 'Terlewat' else 'Belum mulai' end)) order by d) into days
 from generate_series(date_trunc('month',today),today,interval '1 day') d left join kb_private.study_day s on s.uid=me and s.day=d::date;
 if claim then update kb_private.study_day set notified=true where uid=me and day=today and not notified;notice:=found;end if;
 return jsonb_build_object('chain',coalesce(n,0),'remaining',remaining,'days',days,'notice',notice);
end $$;
create table kb_private.language_run(id uuid primary key,uid uuid not null,course text not null,score int not null,completed timestamptz default now());
create function public.kb_language(course_id text default null,attempt uuid default null,answers jsonb default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid();keys jsonb; n int;
begin
 if me is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Gunakan akun sekolah'; end if;
 if attempt is not null then
 keys:=case course_id when 'id' then '["pagi|malam","saya membaca buku","selamat pagi","terima kasih"]' when 'en' then '["buku|air","i like apples","good morning","thank you"]' when 'ja' then '["air|buku","これは本です","おはよう","ありがとう"]' end;
 if keys is null or jsonb_typeof(answers) is distinct from 'array' or jsonb_array_length(answers)<>4 or exists(select from jsonb_array_elements(answers) a where jsonb_typeof(a)<>'string' or length(trim(a#>>'{}')) not between 1 and 256) or pg_column_size(answers)>4096 then raise exception 'Sesi belum lengkap';end if;
 select count(*) into n from generate_series(0,3) i where keys->>i=answers->>i or (course_id='ja' and i=1 and answers->>i='これはほんです');
 insert into kb_private.language_run(id,uid,course,score) values(attempt,me,course_id,n) on conflict do nothing;
 if found then perform kb_private.record_study(me,'bahasa',attempt::text);end if;
 end if;
 return (select coalesce(jsonb_object_agg(course,summary),'{}') from (select course,jsonb_build_object('runs',count(*),'best',max(score)) summary from kb_private.language_run where uid=me group by course)t);
end $$;
revoke all on function kb_private.study_trigger(),kb_private.record_study(uuid,text,text),public.kb_language(text,uuid,jsonb),public.kb_study_status(boolean) from public,anon,authenticated;
grant execute on function public.kb_language(text,uuid,jsonb),public.kb_study_status(boolean) to authenticated;
commit;
