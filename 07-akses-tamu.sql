begin;
-- Batasi JWT tamu ke ruang live pada objek KawanBelajarku yang dikenal.
do $$
declare t text;
begin
 foreach t in array array['profiles','subjects','materials','quizzes','questions','quiz_results','progress','site_config','features','attachments','announcements','kb_agenda','kb_material_activity','kb_chapters','kb_banners'] loop
 execute format('create policy kb_school_account on public.%I as restrictive for all to authenticated using (not coalesce((auth.jwt()->>''is_anonymous'')::boolean,false)) with check (not coalesce((auth.jwt()->>''is_anonymous'')::boolean,false))',t);
 end loop;
end $$;
create policy kb_school_storage on storage.objects as restrictive for all to authenticated
using (bucket_id<>'kb-learning' or not coalesce((auth.jwt()->>'is_anonymous')::boolean,false))
with check (bucket_id<>'kb-learning' or not coalesce((auth.jwt()->>'is_anonymous')::boolean,false));
-- Pertahankan badan fungsi lama dan identitas pemanggil Supabase.
alter function public.kb_begin_quiz(text) set schema kb_private;
revoke all on function kb_private.kb_begin_quiz(text) from public,anon,authenticated;
create function public.kb_begin_quiz(p_quiz text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Gunakan akun sekolah'; end if;
 return kb_private.kb_begin_quiz(p_quiz);
end $$;
revoke all on function public.kb_begin_quiz(text) from public,anon;
grant execute on function public.kb_begin_quiz(text) to authenticated;
alter function public.kb_submit_quiz(uuid,jsonb) set schema kb_private;
revoke all on function kb_private.kb_submit_quiz(uuid,jsonb) from public,anon,authenticated;
create function public.kb_submit_quiz(p_attempt uuid,p_answers jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Gunakan akun sekolah'; end if;
 return kb_private.kb_submit_quiz(p_attempt,p_answers);
end $$;
revoke all on function public.kb_submit_quiz(uuid,jsonb) from public,anon;
grant execute on function public.kb_submit_quiz(uuid,jsonb) to authenticated;
alter function public.kb_material_action(text,text,boolean) set schema kb_private;
revoke all on function kb_private.kb_material_action(text,text,boolean) from public,anon,authenticated;
create function public.kb_material_action(p_material text,p_action text,p_value boolean default true) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Gunakan akun sekolah'; end if;
 perform kb_private.kb_material_action(p_material,p_action,p_value);
end $$;
revoke all on function public.kb_material_action(text,text,boolean) from public,anon;
grant execute on function public.kb_material_action(text,text,boolean) to authenticated;
alter function public.kb_set_name(text) set schema kb_private;
revoke all on function kb_private.kb_set_name(text) from public,anon,authenticated;
create function public.kb_set_name(p_name text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Gunakan akun sekolah'; end if;
 perform kb_private.kb_set_name(p_name);
end $$;
revoke all on function public.kb_set_name(text) from public,anon;
grant execute on function public.kb_set_name(text) to authenticated;
alter function public.kb_popular_subjects() set schema kb_private;
revoke all on function kb_private.kb_popular_subjects() from public,anon,authenticated;
create function public.kb_popular_subjects() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Gunakan akun sekolah'; end if;
 return kb_private.kb_popular_subjects();
end $$;
revoke all on function public.kb_popular_subjects() from public,anon;
grant execute on function public.kb_popular_subjects() to authenticated;
commit;
