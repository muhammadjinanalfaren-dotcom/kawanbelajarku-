-- Pemeriksaan baca saja setelah 02-remake.sql. Jalankan dari proyek Supabase yang sama.
select t.relname as tabel,t.relrowsecurity as rls_aktif
from pg_class t join pg_namespace n on t.relnamespace=n.oid
where n.nspname='public' and t.relname in ('profiles','subjects','materials','quizzes','questions','quiz_results',
  'progress','announcements','site_config','features','attachments','kb_material_activity','kb_agenda')
order by tabel;

-- Kolom hasil pemeriksaan ini seharusnya semuanya false.
select has_table_privilege('anon','public.questions','SELECT') as anon_bisa_baca_soal,
       has_any_column_privilege('anon','public.questions','SELECT') as anon_bisa_baca_kolom_soal,
       has_table_privilege('authenticated','public.quiz_results','INSERT') as klien_bisa_menulis_skor,
       has_any_column_privilege('authenticated','public.quiz_results','INSERT') as klien_bisa_menulis_kolom_skor,
       has_column_privilege('authenticated','public.profiles','role','UPDATE') as klien_bisa_mengubah_role,
       has_function_privilege('anon','public.kb_begin_quiz(text)','EXECUTE') as anon_bisa_memulai_kuis,
       has_schema_privilege('authenticated','kb_private','USAGE') as klien_bisa_mengakses_skema_privat;

-- Policy restrictive memastikan policy permisif lama tidak dapat melewati batas akses.
select tablename,policyname,permissive,roles,cmd from pg_policies
where schemaname='public' and policyname in ('kb_question_guard','kb_own_guard','kb_archive_guard',
  'kb_attachment_guard','kb_insert_guard','kb_update_guard','kb_delete_guard')
order by tablename,policyname;

select id,public,file_size_limit from storage.buckets where id in ('media','kb-learning');
