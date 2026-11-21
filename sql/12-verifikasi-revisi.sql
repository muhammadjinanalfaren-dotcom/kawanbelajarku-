-- Pemeriksaan baca saja setelah 10 dan 11.
select item,hasil,harapan from (values
 ('RPC bahasa',to_regprocedure('public.kb_language(text,uuid,jsonb)') is not null,true),
 ('RPC kalender',to_regprocedure('public.kb_study_status(boolean)') is not null,true),
 ('RPC konten kelas',to_regprocedure('public.kb_class_content(text,jsonb)') is not null,true),
 ('Storage kelas privat',exists(select 1 from storage.buckets where id='kb-class-content' and not public and file_size_limit=52428800),true),
 ('Tamu tanpa sesi bisa membuat kuis',has_function_privilege('anon','public.kb_live_bank(text,jsonb)','execute'),false),
 ('Klien bisa mencatat streak langsung',has_function_privilege('authenticated','kb_private.record_study(uuid,text,text)','execute'),false),
 ('Klien bisa membaca snapshot',has_table_privilege('authenticated','kb_private.live_room','select'),false),
 ('Tiga trigger aktivitas terpasang',(select count(*)=3 from pg_trigger where tgname in ('kb_material_streak','kb_quiz_streak','kb_live_streak') and tgenabled='O'),true)
) as checks(item,hasil,harapan);
