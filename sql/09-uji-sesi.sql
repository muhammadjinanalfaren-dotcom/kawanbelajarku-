-- Jalankan di salinan uji setelah 05–07 dengan admin dan siswa yang sudah ada.
-- Menguji RPC sesi di dalam transaksi yang dibatalkan. Tidak menguji WebSocket atau login.
begin;
do $$
declare guru uuid; siswa uuid; bank_id text; room text; v jsonb; rep jsonb; mode text;
begin
 select id into strict guru from public.profiles where role='admin' order by id limit 1;
 select id into strict siswa from public.profiles where role='student' order by id limit 1;
 foreach mode in array array['host','self'] loop
 perform set_config('request.jwt.claim.sub',guru::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',guru,'role','authenticated','is_anonymous',false)::text,true);
 bank_id:=public.kb_live_bank('save','{"title":"Uji dalam transaksi","items":[{"text":"Pilih bilangan genap","type":"single","weight":1,"options":["2","3"],"key":"2"}]}'::jsonb)#>>'{}';
 room:=public.kb_live_create('new:'||bank_id,jsonb_build_object('title','Uji sesi','mode',mode,'seconds',0,'capacity',2,'board',true));
 perform set_config('request.jwt.claim.sub',siswa::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',siswa,'role','authenticated')::text,true);
 perform public.kb_live_action(room,'join','{"name":"Peserta uji","avatar":1}');
 v:=public.kb_live_state(room);
 if v->>'status'<>'waiting' or v->'question'<>'null'::jsonb or (v->>'host')::boolean then raise exception 'Lobi tidak sesuai'; end if;
 perform set_config('request.jwt.claim.sub',guru::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',guru,'role','authenticated')::text,true);
 perform public.kb_live_action(room,'start');perform public.kb_live_action(room,'pause');perform public.kb_live_action(room,'resume');
 perform set_config('request.jwt.claim.sub',siswa::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',siswa,'role','authenticated')::text,true);
 v:=public.kb_live_state(room);
 if v->'question' ? 'key' or v->'question'->>'text' is distinct from 'Pilih bilangan genap' then raise exception 'Soal peserta tidak sesuai'; end if;
 perform public.kb_live_action(room,'answer','{"pos":0,"answer":"2"}');
 perform public.kb_live_action(room,'answer','{"pos":0,"answer":"2"}');
 perform set_config('request.jwt.claim.sub',guru::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',guru,'role','authenticated')::text,true);
 perform public.kb_live_action(room,'finish');rep:=public.kb_live_report(room);
 if jsonb_array_length(rep->'answers')<>1 or (rep->'answers'->0->>'points')::int is distinct from 100 then raise exception 'Pemeriksaan skor gagal'; end if;
 end loop;
end $$;
select 'Dua mode, lobi, jeda, submit ulang, nilai dan laporan sesuai' as hasil;
rollback;
