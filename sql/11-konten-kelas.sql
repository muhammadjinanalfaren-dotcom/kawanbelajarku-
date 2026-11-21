begin;
create table kb_private.class_post(
 id uuid primary key, class_id uuid not null references kb_private.classroom, title text not null,
 instructions text not null, due timestamptz, published boolean not null default false,
 menu_label text not null default '',position integer not null default 0,visible boolean not null default true,
 files text[] not null default '{}'
);
create function kb_private.manage_class(cid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select from kb_private.classroom c where c.id=cid and (public.kb_is_admin() or (c.owner_id=auth.uid() and kb_private.is_teacher()))) $$;
create function public.kb_class_content(action text, payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare cid uuid:=(payload->>'class_id')::uuid; pid uuid:=(payload->>'id')::uuid; post kb_private.class_post; files text[]; path text; may_edit boolean;
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Gunakan akun sekolah';end if;
 may_edit:=kb_private.manage_class(cid);
 if not may_edit and not exists(select from kb_private.enrollment where student=auth.uid() and class_id=cid) then raise exception 'Akses kelas ditolak';end if;
 if action='list' then return jsonb_build_object('manage',may_edit,'posts',(select coalesce(jsonb_agg(to_jsonb(t) order by t.position,t.title),'[]') from kb_private.class_post t where t.class_id=cid and (may_edit or t.published)));end if;
 if not may_edit or action<>'save' then raise exception 'Izin mengelola kelas diperlukan';end if;
 if length(trim(coalesce(payload->>'title',''))) not between 1 and 150 or length(trim(coalesce(payload->>'instructions',''))) not between 1 and 12000 then raise exception 'Periksa judul dan instruksi';end if;
 select * into post from kb_private.class_post where id=pid for update;
 if found and post.class_id<>cid then raise exception 'Konten milik kelas lain';end if;
 files:=array(select jsonb_array_elements_text(payload->'files'));
 if cardinality(files)>12 then raise exception 'Maksimal 12 lampiran';end if;
 foreach path in array files loop
 if split_part(path,'/',1)<>cid::text or split_part(path,'/',2)<>pid::text or not exists(select from storage.objects where bucket_id='kb-class-content' and name=path) then raise exception 'Lampiran belum tersedia pada tugas ini';end if;
 end loop;
 insert into kb_private.class_post values(pid,cid,trim(payload->>'title'),trim(payload->>'instructions'),(payload->>'due')::timestamptz,(payload->>'published')::boolean,left(trim(payload->>'menu_label'),60),(payload->>'position')::int,(payload->>'visible')::boolean,files)
 on conflict(id) do update set title=excluded.title,instructions=excluded.instructions,due=excluded.due,published=excluded.published,menu_label=excluded.menu_label,position=excluded.position,visible=excluded.visible,files=excluded.files where class_post.class_id=excluded.class_id;
 if not found then raise exception 'Konflik konten kelas';end if;
 return to_jsonb(pid);
end $$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('kb-class-content','kb-class-content',false,52428800,array['application/pdf','image/jpeg','image/png','image/webp','video/mp4','video/webm','text/plain']);
create function public.kb_class_file(path text,writing boolean) returns boolean language plpgsql stable security definer set search_path='' as $$
declare cid uuid;pid uuid;
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) or path !~ '^[a-f0-9-]{36}/[a-f0-9-]{36}/[a-f0-9-]{36}_[A-Za-z0-9._-]{1,100}$' then return false;end if;
 cid:=split_part(path,'/',1)::uuid;pid:=split_part(path,'/',2)::uuid;
 if kb_private.manage_class(cid) then return true;end if;
 return not writing and exists(select from kb_private.class_post p join kb_private.enrollment e on e.class_id=p.class_id where p.id=pid and p.class_id=cid and p.published and path=any(p.files) and e.student=auth.uid());
exception when invalid_text_representation then return false;
end $$;
create policy kb_class_read on storage.objects for select to authenticated using(bucket_id='kb-class-content' and public.kb_class_file(name,false));
create policy kb_class_insert on storage.objects for insert to authenticated with check(bucket_id='kb-class-content' and public.kb_class_file(name,true));
create policy kb_class_read_bound on storage.objects as restrictive for select to public using(case when bucket_id='kb-class-content' then public.kb_class_file(name,false) else true end);
create policy kb_class_insert_bound on storage.objects as restrictive for insert to public with check(case when bucket_id='kb-class-content' then public.kb_class_file(name,true) else true end);
create policy kb_class_no_update on storage.objects as restrictive for update to public using(bucket_id<>'kb-class-content') with check(bucket_id<>'kb-class-content');
create policy kb_class_no_delete on storage.objects as restrictive for delete to public using(bucket_id<>'kb-class-content');
revoke all on function kb_private.manage_class(uuid),public.kb_class_content(text,jsonb),public.kb_class_file(text,boolean) from public,anon,authenticated;
grant execute on function public.kb_class_content(text,jsonb),public.kb_class_file(text,boolean) to authenticated;
grant execute on function public.kb_class_file(text,boolean) to anon;
commit;
