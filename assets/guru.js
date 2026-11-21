import {db,allRows,main,guard,esc,setView,heading,button,busy,loadError,section,empty,toast} from './common.js';
import {rpc,teacherNav,livebar,statuses,types,opt,field,answerFields} from './live-shared.js';
let account,staff=false,bank=[],legacy=[],history=[],draft;
const fresh=()=>({type:'single',text:'',options:[],key:'',weight:1,image:'',explanation:''});
const $=id=>document.getElementById(id);
const input=(name,value='',attrs='')=>'<input name="'+name+'" value="'+esc(value)+'" '+attrs+'>';
const check=(name,label,on=false)=>'<label class="control-line"><input type="checkbox" name="'+name+'" '+(on?'checked':'')+'>'+label+'</label>';
const textarea=(name,value)=>'<textarea name="'+name+'">'+esc(value)+'</textarea>';
const lines=v=>v.split('\n').map(x=>x.trim()).filter(Boolean);
async function load(){
 [bank,legacy,history]=await Promise.all([rpc('bank',{action:'list'}),staff?allRows(()=>db.from('quizzes').select('id,title').eq('kb_archived',false).order('id')):[],rpc('history')]);
 home();if(location.hash==='#buat'){historyReplace();document.getElementById('new').click();}
}
function historyReplace(){window.history.replaceState(null,'',location.pathname);}
function home(){
 const quizSelect='<select name="source" required>'+opt('','Pilih kuis')+bank.map(b=>opt('new:'+b.id,b.title)).join('')+legacy.map(b=>opt(b.id,b.title+' · koleksi sekolah')).join('')+'</select>';
 setView('<div class="teacher">'+heading(staff?'Ruang guru':'Kuis Saya','Siapkan soal dan bagikan kode ruang kepada teman.')+(staff?teacherNav:'')+button('Gabung dengan kode','./live.html')+(staff?button('Konten dan menu kelas','./konten.html','ghost'):'')+
 section('Mulai sesi live','<form id="room" class="panel form">'+field('Nama sesi',input('title','','required maxlength="100"'))+field('Bank kuis',quizSelect)+
 field('Alur permainan','<select name="mode">'+opt('host','Dipandu guru')+opt('self','Kecepatan siswa')+'</select>')+
 '<details><summary>Pengaturan permainan</summary><div class="stack">'+check('play','Ikut bermain sebagai peserta')+check('timer','Gunakan timer per soal')+field('Durasi timer (detik)',input('seconds',30,'type="number" min="1" max="600" required'))+field('Batas peserta',input('capacity',40,'type="number" min="1" max="200" required'))+
 field('Penilaian','<select name="score">'+opt('accuracy','Akurasi')+opt('speed','Akurasi dan kecepatan')+'</select>')+field('Pembahasan','<select name="reveal">'+opt('end','Setelah sesi selesai')+'</select>')+
 check('ready','Tampilkan tombol siap di lobi')+check('shuffleQuestions','Acak urutan soal')+check('shuffleOptions','Acak urutan pilihan')+check('board','Tampilkan peringkat (saat pembahasan dibuka dan di akhir)',true)+check('guest','Izinkan akun tamu')+'</div></details><button class="btn">Buat ruang</button></form>')+
 section('Bank soal saya','<button class="btn" id="new">Buat kuis</button><div class="stack">'+bank.map(b=>'<button class="btn ghost" data-edit="'+esc(b.id)+'">'+esc(b.title)+'</button>').join('')+'</div>')+
 section('Sesi dan laporan',history.length?'<div class="stack">'+history.map(r=>button(r.title+' · '+statuses[r.status],'./live.html?room='+r.code,'ghost')).join('')+'</div>':empty('Sesi yang kamu buat akan tampil di sini.'))+'</div>');
 $('room').onsubmit=e=>{e.preventDefault();busy(e.submitter,async()=>{
 const f=new FormData(e.target),settings=Object.fromEntries(f);
 for(const k of ['play','ready','board','guest','shuffleQuestions','shuffleOptions'])settings[k]=f.has(k);
 settings.player=account.name;settings.capacity=Number(settings.capacity);settings.seconds=f.has('timer')?Number(settings.seconds):0;
 const code=await rpc('create',{source:settings.source,settings});location.assign('./live.html?room='+code);
 });};
 $('new').onclick=()=>{draft={title:'',items:[fresh()]};editor();};
 main.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>busy(b,async()=>{draft=await rpc('bank',{action:'get',payload:{id:b.dataset.edit}});editor();}));
}
function question(q,i){
 const many=['multi','match','order'].includes(q.type);
 return '<fieldset class="form editor-row"><legend>Soal '+(i+1)+'</legend>'+field('Jenis soal','<select name="type">'+Object.entries(types).map(([k,v])=>opt(k,v,k===q.type)).join('')+'</select>')+
 field('Pertanyaan',textarea('text',q.text))+field('Bobot',input('weight',q.weight,'type="number" min="1" max="100" required'))+
 (q.type==='match'?field('Kolom kiri · satu per baris',textarea('prompts',(q.prompts||[]).join('\n'))):'')+
 (!['short','boolean'].includes(q.type)?field('Pilihan · satu per baris',textarea('options',(q.options||[]).join('\n'))):'')+
 field(many?'Kunci · satu pilihan per baris sesuai urutan jawaban':'Kunci jawaban',q.type==='boolean'?'<select name="key">'+['Benar','Salah'].map(v=>opt(v,v,q.key===v)).join('')+'</select>':textarea('key',Array.isArray(q.key)?q.key.join('\n'):q.key))+
 field('Gambar soal · URL HTTPS (opsional)',input('image',q.image,'type="url"'))+field('Pembahasan',textarea('explanation',q.explanation))+
 '<div class="controls">'+[['up','Naik'],['down','Turun'],['copy','Gandakan'],['remove','Hapus']].map(([k,v])=>'<button class="pill" type="button" data-op="'+k+'" data-i="'+i+'">'+v+'</button>').join('')+'</div></fieldset>';
}
function gather(){
 draft.title=$('title').value.trim();
 draft.items=[...main.querySelectorAll('fieldset')].map(f=>{
 const get=k=>f.querySelector('[name="'+k+'"]')?.value.trim()||'';
 const type=get('type');
 return {type,text:get('text'),options:type==='boolean'?['Benar','Salah']:lines(get('options')),prompts:lines(get('prompts')),key:['multi','match','order'].includes(type)?lines(get('key')):get('key'),weight:Number(get('weight')),image:get('image'),explanation:get('explanation')};
 });
}
function editor(){
 setView('<div class="teacher">'+heading('Editor kuis','Periksa kunci dan pembahasan sebelum menyimpan.')+'<form class="panel form" id="editor">'+field('Judul kuis','<input id="title" required maxlength="120" value="'+esc(draft.title)+'">')+draft.items.map(question).join('')+
 '<div class="controls"><button type="button" class="btn secondary" id="add">Tambah soal</button><button type="button" class="btn ghost" id="preview">Pratinjau</button><button class="btn">Simpan kuis</button><button type="button" class="pill" id="back">Kembali</button></div></form><div id="previewBox"></div></div>');
 $('back').onclick=home;$('add').onclick=()=>{gather();draft.items.push(fresh());editor();};
 main.querySelectorAll('[name=type]').forEach(el=>el.onchange=()=>{gather();editor();});
 main.querySelectorAll('[data-op]').forEach(b=>b.onclick=()=>{gather();const i=Number(b.dataset.i),a=draft.items;
 switch(b.dataset.op){case 'copy':a.splice(i+1,0,structuredClone(a[i]));break;case 'remove':if(a.length>1)a.splice(i,1);break;case 'up':if(i>0)[a[i],a[i-1]]=[a[i-1],a[i]];break;case 'down':if(i+1<a.length)[a[i],a[i+1]]=[a[i+1],a[i]];}
 editor();});
 $('preview').onclick=()=>{gather();$('previewBox').innerHTML=section('Pratinjau siswa',draft.items.map(q=>'<article class="card"><h3>'+esc(q.text)+'</h3>'+answerFields(q)+'</article>').join(''));$('previewBox').scrollIntoView();};
 $('editor').onsubmit=e=>{e.preventDefault();busy(e.submitter,async()=>{gather();await rpc('bank',{action:'save',payload:draft});await load();toast('Kuis tersimpan.');});};
}
async function start(){const a=await guard();if(!a)return;account=a;staff=['admin','guru','teacher'].includes(a.profile?.role);livebar('Beranda','./kawanbelajarku-dashboard.html');await load();}
start().catch(loadError);
