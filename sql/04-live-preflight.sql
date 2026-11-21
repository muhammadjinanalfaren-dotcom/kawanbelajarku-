-- Pemeriksaan baca saja. Simpan hasil sebelum memasang V2.
select n.nspname, c.relname, pg_get_constraintdef(x.oid) definition from pg_constraint x join pg_class c on c.oid=x.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','kb_private');
select * from pg_indexes where schemaname in ('public','kb_private');
select event_object_table,trigger_name,action_statement from information_schema.triggers where trigger_schema='public';
select id,name,public from storage.buckets;
select * from pg_publication_tables where pubname='supabase_realtime';
select n.nspname, c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','kb_private') and c.relname ~ '(session|participant|assignment|class|live|bank)';
select role,count(*) from public.profiles group by role;

select table_schema,table_name,column_name,data_type,udt_name from information_schema.columns where table_schema='public' and table_name in ('questions','progress','profiles','materials','quizzes','subjects') order by table_name,ordinal_position;
select routine_schema,routine_name,grantee,privilege_type from information_schema.routine_privileges where routine_schema='public' and grantee in ('PUBLIC','anon','authenticated');
