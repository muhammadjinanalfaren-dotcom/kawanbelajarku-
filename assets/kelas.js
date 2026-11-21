import {db,allRows,guard,esc,setView,heading,busy,loadError,toast,empty,section,button} from './common.js';
import {rpc,teacherNav,livebar,field,opt,statuses} from './live-shared.js';
const $=id=>document.getElementById(id);
const api=(action,payload={})=>rpc('class',{action,payload});
let account,teacher,bank=[],classId=new URLSearchParams(location.search).get('id');
const here=id=>'./kelas.html?id='+encodeURIComponent(id);
function form(id,inputs,label){return '<form class="panel form" id="'+id+'">'+inputs+'<button class="btn">'+label+'</button></form>';}
function submit(id,fn){const f=$(id);if(f)f.onsubmit=e=>{e.preventDefault();busy(e.submitter,()=>fn(Object.fromEntries(new FormData(f))));};}
async function list(){
 const rooms=await api('list');
 const users=account.admin?await allRows(()=>db.from('profiles').select('id,full_name,role').order('id')):[];
 setView('<div class="teacher">'+heading('Kelas dan tugas','Ikuti perkembangan tugas di kelasmu.')+(teacher?teacherNav:'')+
 section('Kelas saya',rooms.length?'<div class="grid">'+rooms.map(c=>button(c.title,here(c.id),'ghost')).join('')+'</div>':empty('Belum ada kelas. Gunakan undangan guru untuk bergabung.'))+
 section('Gabung kelas',form('join',field('Kode undangan','<input name="invite" required>'),'Gabung'))+
 (teacher?section('Kelas baru',form('newclass',field('Nama kelas','<input name="title" required maxlength="100">'),'Buat kelas')):'')+
 (account.admin?section('Akses guru',form('role',field('Pengguna','<select name="target" required>'+users.filter(x=>x.role!=='admin').map(u=>opt(u.id,(u.full_name||'Siswa')+' · '+u.id.slice(0,8))).join('')+'</select>')+field('Izin mengajar','<select name="enabled">'+opt('yes','Berikan akses guru')+opt('no','Cabut izin tambahan')+'</select>'),'Simpan izin')):'')+'</div>');
 submit('join',async f=>location.assign(here(await api('join',f))));
 submit('newclass',async f=>location.assign(here(await api('create',f))));
 submit('role',async f=>{await rpc('teacher',{target:f.target,enabled:f.enabled==='yes'});toast('Izin mengajar diperbarui.');});
}
async function view(){
 const c=await api('view',{class_id:classId});
 if(c.staff)bank=await rpc('bank',{action:'list'});
 setView('<div class="teacher">'+heading(c.title,'Tugas dan aktivitas kelas','./kelas.html')+button('Konten dan lampiran kelas','./konten.html#/'+encodeURIComponent(classId),'secondary')+
 (c.staff?section('Peserta kelas · '+c.members.length,'<div class="panel"><p>Kode undangan</p><b style="overflow-wrap:anywhere">'+esc(c.invite)+'</b><div class="stack">'+c.members.map(m=>'<div>'+esc(m.name)+' <button class="pill" data-remove="'+m.uid+'">Keluarkan</button></div>').join('')+'</div></div>')+
 section('Berikan tugas',bank.length?form('assign',field('Kuis','<select name="bank">'+bank.map(b=>opt(b.id,b.title)).join('')+'</select>')+field('Tenggat waktu lokal','<input type="datetime-local" name="due" required>')+'<label><input type="checkbox" name="retry"> Izinkan mengulang</label>','Bagikan tugas'):button('Buat kuis di bank soal','./guru.html')):'')+
 section('Daftar tugas',c.tasks.length?'<div class="stack">'+c.tasks.map(t=>{
 const past=Date.parse(t.due)<=Date.now(),latest=t.runs[0];
 const status=latest?.status==='finished'?'Selesai':past?'Terlambat':latest?'Sedang dikerjakan':'Belum dikerjakan';
 return '<article class="card"><h3>'+esc(t.title)+'</h3><p>Tenggat '+esc(new Date(t.due).toLocaleString('id-ID'))+'</p>'+
 (c.staff?'<p>'+t.runs.filter(r=>r.status==='finished').length+' percobaan selesai</p>':'<p>'+status+'</p>')+
 (!c.staff&&!past&&(!latest||latest.status!=='finished'||t.retry)?'<button class="btn" data-task="'+t.id+'">'+(latest?.status==='active'?'Lanjutkan':latest?'Ulangi':'Kerjakan')+'</button>':'')+
 t.runs.map(r=>button((c.staff?r.name+' · ':'')+statuses[r.status],c.staff&&r.status==='finished'?'./laporan.html?room='+r.code:'./live.html?room='+r.code,'ghost')).join('')+'</article>';
 }).join('')+'</div>':empty('Guru belum membagikan tugas.'))+'</div>');
 submit('assign',async f=>{await api('assign',{...f,class_id:classId,due:new Date(f.due).toISOString(),retry:!!f.retry});await view();});
 document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>busy(b,async()=>{if(confirm('Keluarkan siswa dari kelas?')){await api('remove',{class_id:classId,uid:b.dataset.remove});await view();}}));
 document.querySelectorAll('[data-task]').forEach(b=>b.onclick=()=>busy(b,async()=>{const code=await api('attempt',{class_id:classId,task:b.dataset.task});location.assign('./live.html?room='+code);}));
}
async function start(){account=await guard();if(!account)return;teacher=['admin','guru','teacher'].includes(account.profile?.role);livebar('Beranda','./kawanbelajarku-dashboard.html');if(classId)await view();else await list();}
start().catch(loadError);
