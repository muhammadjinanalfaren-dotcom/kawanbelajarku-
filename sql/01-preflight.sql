-- Pemeriksaan baca saja. Simpan hasilnya sebelum menjalankan migrasi.
select table_name,column_name,data_type,is_nullable,column_default
from information_schema.columns
where table_schema='public' and table_name in
('profiles','students','subjects','materials','quizzes','questions','quiz_results','progress','site_config','features','attachments','announcements')
order by table_name,ordinal_position;

select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
from pg_policies where schemaname='public' or (schemaname='storage' and tablename='objects')
order by schemaname,tablename,policyname;

select table_name from information_schema.views where table_schema='public';
select routine_name,security_type from information_schema.routines where routine_schema='public';
