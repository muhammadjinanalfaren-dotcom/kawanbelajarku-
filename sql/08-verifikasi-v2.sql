-- Baca saja. Nilai perlu cocok dengan kolom harapan.
select 'RLS sinyal' pemeriksaan,(select relrowsecurity from pg_class where oid='public.kb_live_signal'::regclass) hasil,true harapan
union all select 'Realtime sinyal',exists(select from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='kb_live_signal'),true
union all select 'Klien bisa baca snapshot privat',has_table_privilege('authenticated','kb_private.live_room','SELECT'),false
union all select 'Klien bisa ubah nilai',has_table_privilege('authenticated','kb_private.live_answer','UPDATE'),false
union all select 'Anon publik bisa ambil laporan',has_function_privilege('anon','public.kb_live_report(text)','EXECUTE'),false
union all select 'Klien bisa tulis sinyal',has_table_privilege('authenticated','public.kb_live_signal','UPDATE'),false
union all select 'Tamu dibatasi pada materi',exists(select from pg_policies where schemaname='public' and tablename='materials' and policyname='kb_school_account'),true;
