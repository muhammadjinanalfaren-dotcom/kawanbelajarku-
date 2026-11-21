import {db,main,checked,identity,esc,button,setView,heading,busy,loadError,readableError,section,empty,toast} from './common.js';
import {rpc,animals,face,field,fmt,statuses,answerFields,collect,livebar} from './live-shared.js';
let code='',state,offset=0,inFlight=false,queued=false,stamp='',autotime='',account;
const $=id=>document.getElementById(id);
const action=(act,payload={})=>rpc('action',{room_code:code,action:act,payload});
const frame=html=>setView('<div class="live-frame">'+html+'</div>');
const ctl=(key,label)=>'<button type="button" class="btn secondary" data-act="'+key+'">'+label+'</button>';
const go=()=>location.assign('./live.html?room='+encodeURIComponent(code));
async function entrance(){
 const history=account?await rpc('history'):[];
 frame(heading('Gabung kuis live','Masukkan enam karakter yang dibagikan guru.')+'<form id="check" class="panel form">'+field('Kode ruang','<input name="code" autocapitalize="characters" maxlength="6" pattern="[a-fA-F0-9]{6}" required placeholder="Kode 6 karakter">')+'<button class="btn">Periksa kode</button></form>'+
 (!account||account.user.is_anonymous?'<p><a class="textlink" href="./index.html">Masuk dengan akun sekolah</a> atau lanjut sebagai tamu jika diizinkan.</p>':'')+
 (history.length?section('Riwayat ruang','<div class="stack">'+history.map(r=>button(r.title+' · '+statuses[r.status],'./live.html?room='+r.code,'ghost')).join('')+'</div>'):''));
 $('check').onsubmit=e=>{e.preventDefault();busy(e.submitter,async()=>{
  code=e.target.code.value.trim().toUpperCase();
  if(!account){await checked(db.auth.signInAnonymously());account=await identity();}
  const found=await action('check');if(found.joined){go();return;}choose(found.title);
 });};
}
function choose(title){
 frame(heading(title,'Pilih nama dan avatar yang akan terlihat di lobi.')+'<form id="join" class="panel form">'+field('Nama peserta','<input name="name" required maxlength="32" value="'+esc(account.user.is_anonymous?'':account.name)+'">')+'<fieldset><legend>Avatar kuis</legend><div class="picks">'+animals.map((a,i)=>'<label class="animal" title="'+a+'">'+face(i)+'<input type="radio" aria-label="'+a+'" name="avatar" value="'+i+'" '+(i===0?'checked':'')+'></label>').join('')+'</div></fieldset><button class="btn">Masuk lobi</button></form>');
 $('join').onsubmit=e=>{e.preventDefault();busy(e.submitter,async()=>{await action('join',Object.fromEntries(new FormData(e.target)));go();});};
}
function results(s){
 const r=s.result;
 return (r?'<section class="live-hero"><span class="person">'+face(s.avatar)+esc(s.name)+'</span><h2>'+Math.round(r.correct*100/s.total)+'% benar</h2><p>'+r.score+' poin · '+r.correct+' benar · '+r.wrong+' salah · '+(s.total-r.correct-r.wrong)+' tidak dijawab dari '+s.total+' soal</p><p>Durasi '+r.duration+' detik'+(s.config.board?' · Peringkat '+r.ranking:'')+'</p></section>':'')+
 (s.board?section('Peringkat sesi','<div class="stack">'+s.board.map(x=>'<div class="person">'+face(x.avatar)+'<b>'+x.ranking+'</b> '+esc(x.name)+' · '+x.score+' poin</div>').join('')+'</div>'):'')+
 (s.review?section('Pembahasan','<div class="stack">'+s.review.map(x=>'<article class="card"><h3>'+esc(x.text)+'</h3><p>Jawabanmu · '+esc(fmt(x.answer))+'</p><p>Kunci · '+esc(fmt(x.key))+'</p><small>'+esc(x.explanation)+'</small></article>').join('')+'</div>'):'')+
 (s.report?button('Buka laporan guru','./laporan.html?room='+code):'');
}
const standingRows=board=>board.map(x=>'<p>'+x.ranking+'. '+esc(x.name)+' · '+x.score+' poin</p>').join('');
function draw(s){
 const q=s.question, active=s.status==='active',wait=s.status==='waiting';
 let body='';
 if(wait){body='<div class="live-hero"><small>Kode ruang</small><div class="room-code">'+code+'</div><p>'+(s.locked?'Lobi dikunci.':'Menunggu guru memulai.')+'</p></div>';}
 if(wait&&!s.host&&s.config.ready)body+=ctl('ready',s.ready?'Batalkan siap':'Saya siap');
 if(s.status==='paused')body=empty('Sesi dijeda. Tunggu guru melanjutkan.');
 if(s.status==='cancelled')body=empty('Guru membatalkan sesi ini.');
 if(active && q){
 body='<div class="room-strip"><b>Soal '+(s.pos+1)+' dari '+s.total+'</b>'+(s.config.seconds&&!s.host?'<span id="timer"></span>':'')+'</div><progress class="progress-meter" value="'+(s.pos+1)+'" max="'+s.total+'"></progress>'+
 '<section class="panel stack"><h2>'+esc(q.text)+'</h2>'+(q.image?'<img class="photo-q" src="'+esc(q.image)+'" alt="Gambar soal">':'')+
 (s.host?'':s.accepted?empty(s.feedback?(s.feedback.correct?'Benar. ':'Jawaban tersimpan. ')+'Kunci: '+fmt(s.feedback.key):'Jawaban tersimpan. Tunggu soal berikutnya.'):'<form id="answer" class="form">'+answerFields(q)+'<button class="btn">Kirim jawaban</button></form>')+'</section>';
 }
 if(active && !q)body=empty('Semua jawabanmu tersimpan. Hasil akan muncul saat guru menutup sesi.');
 if(s.host && !['finished','cancelled'].includes(s.status)){
 body+='<div class="controls">'+(wait?ctl('start','Mulai kuis')+ctl(s.locked?'unlock':'lock',s.locked?'Buka lobi':'Kunci lobi')+ctl('cancel','Batalkan sesi'):ctl(active?'pause':'resume',active?'Jeda':'Lanjutkan')+(active&&s.config.mode==='host'&&s.pos+1<s.total?ctl('next','Soal berikutnya'):'')+ctl('finish','Akhiri sesi'))+'</div>';
 }
 if(wait||s.host&&active)body+=section('Peserta · '+s.members.length,s.members.length?'<div class="people">'+s.members.map(x=>'<span class="person">'+face(x.avatar)+esc(x.name)+(wait&&x.ready?' · Siap':'')+(s.host&&active?' · '+x.submitted+'/'+s.total:'')+(wait&&s.host?'<button class="pill" data-kick="'+esc(x.uid)+'" aria-label="Keluarkan '+esc(x.name)+'">×</button>':'')+'</span>').join('')+'</div>':empty('Bagikan kode di atas agar siswa bisa bergabung.'));
 if(s.board && (active||s.status==='paused')) body+='<details class="panel"><summary>Peringkat sementara</summary><div id="standings">'+standingRows(s.board)+'</div></details>';
 if(s.status==='finished')body=results(s);
 frame(heading(s.title,statuses[s.status]+' · '+(s.config.mode==='host'?'Dipandu guru':'Kecepatan sendiri'))+
 (active&&s.name?'<span class="person">'+face(s.avatar)+esc(s.name)+'</span>':'')+body+'<small id="connection" class="status-strip" role="status"></small>');
 const form=$('answer');if(form)form.onsubmit=e=>{e.preventDefault();busy(e.submitter,async()=>{const res=await action('answer',{pos:s.pos,answer:collect(q,form)});if(res.feedback)toast(res.feedback+' · '+fmt(res.key));await sync();});};
 main.querySelectorAll('[data-act],[data-kick]').forEach(b=>b.onclick=()=>busy(b,async()=>{
  const act=b.dataset.act||'kick';if(['cancel','finish','kick'].includes(act)&&!confirm('Lanjutkan tindakan ini?'))return;
  await action(act,{pos:s.pos,uid:b.dataset.kick,ready:!s.ready});await sync();
 }));
}
async function sync(){
 if(inFlight){queued=true;return;}inFlight=true;
 try{
 const s=await rpc('state',{room_code:code});state=s;offset=Date.parse(s.server)-Date.now();
 // Keep a student's partially filled answer when another participant submits.
 const key=JSON.stringify({...s,server:null,board:s.status==='active'&&!s.host?null:s.board,members:s.status==='waiting'||s.host?s.members:null});
 if(key!==stamp){stamp=key;draw(s);}else if(s.board && $('standings')){$('standings').innerHTML=standingRows(s.board);}if($('connection'))$('connection').textContent='';
 }catch(e){if(!$('connection'))loadError(e);else $('connection').textContent=readableError(e)+' · Mencoba menyambung kembali…';}
 finally{inFlight=false;if(queued){queued=false;void sync();}}
}
async function start(){
 livebar('Keluar ruang','./live.html');account=await identity();
 code=(new URLSearchParams(location.search).get('room')||'').toUpperCase();
 if(!code){await entrance();return;}if(!account){location.replace('./live.html');return;}
 await sync();
 const ch=db.channel('kb-room-'+code).on('postgres_changes',{event:'UPDATE',schema:'public',table:'kb_live_signal',filter:'code=eq.'+code},sync).subscribe();
 const poll=setInterval(sync,5000);addEventListener('online',sync);
 const timer=setInterval(async()=>{
 const s=state,el=$('timer');if(!el||!s?.tick||!s.config.seconds||s.accepted)return;
 const left=Math.max(0,Math.ceil((Date.parse(s.tick)+s.config.seconds*1000-Date.now()-offset)/1000));el.textContent=left+' detik';
 const marker=s.pos+'-'+s.tick;
 if(left===0&&!s.host&&autotime!==marker){autotime=marker;try{await action('answer',{pos:s.pos,answer:null});await sync();}catch(e){autotime='';toast(readableError(e),true);}}
 },300);addEventListener('pagehide',()=>{clearInterval(timer);clearInterval(poll);db.removeChannel(ch);},{once:true});
}
start().catch(loadError);
